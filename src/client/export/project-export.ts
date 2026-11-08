import { embeddedImageData } from "../../domain/rich-text";
import { buildStudyPages } from "../../domain/study-navigation";
import type { CanvasObject, ProjectDetail, RichTextNode } from "../../shared/contracts";
import { createZip } from "./zip";

export type ExportFormat = "html" | "scorm12";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const safeHref = (value: string) =>
  /^(?:https?:|mailto:|#)/u.test(value) ? escapeHtml(value) : "#";

const safeImageSrc = (value: string) =>
  /^(?:https?:\/\/|\/|data:image\/(?:png|jpeg|gif|webp);base64,)/iu.test(value)
    ? escapeHtml(value)
    : "";

function renderInline(nodes: readonly RichTextNode[] = []) {
  return nodes
    .map((node) => {
      let value = escapeHtml(node.text ?? "");
      for (const mark of node.marks ?? []) {
        if (mark.type === "bold") value = `<strong>${value}</strong>`;
        if (mark.type === "italic") value = `<em>${value}</em>`;
        if (mark.type === "underline") value = `<u>${value}</u>`;
        if (mark.type === "strike") value = `<s>${value}</s>`;
        if (mark.type === "code") value = `<code>${value}</code>`;
        if (mark.type === "link") value = `<a href="${safeHref(mark.href ?? "")}">${value}</a>`;
        if (mark.type === "textStyle") {
          const fontFamilies: Record<string, string> = {
            system: "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
            serif: "Georgia,'Times New Roman',serif",
            mono: "ui-monospace,SFMono-Regular,Menlo,monospace",
            arial: "Arial,sans-serif",
            verdana: "Verdana,sans-serif",
          };
          const styles = [
            mark.color ? `color:${mark.color}` : "",
            mark.fontFamily
              ? `font-family:${fontFamilies[mark.fontFamily] ?? fontFamilies.system}`
              : "",
            mark.fontSize ? `font-size:${mark.fontSize}px` : "",
          ]
            .filter(Boolean)
            .join(";");
          if (styles) value = `<span style="${escapeHtml(styles)}">${value}</span>`;
        }
      }
      return value;
    })
    .join("");
}

function renderRichNode(node: RichTextNode): string {
  if (node.type === "image") {
    const image = embeddedImageData(node);
    if (!image) return "";
    return `<figure class="embedded-image align-${image.alignment}"><img src="${safeImageSrc(image.url)}" alt="${escapeHtml(image.alt)}" style="max-width:min(100%,${image.width}px)">${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}</figure>`;
  }
  if (node.type === "heading") {
    const level = Number(node.attrs?.level) === 3 ? 3 : 2;
    return `<h${level}>${renderInline(node.content)}</h${level}>`;
  }
  if (node.type === "blockquote")
    return `<blockquote>${(node.content ?? []).map(renderRichNode).join("")}</blockquote>`;
  if (node.type === "bulletList")
    return `<ul>${(node.content ?? []).map((item) => `<li>${(item.content ?? []).map(renderRichNode).join("")}</li>`).join("")}</ul>`;
  if (node.type === "table")
    return `<div class="table-scroll"><table>${(node.content ?? [])
      .map(
        (row, rowIndex) =>
          `<tr>${(row.content ?? []).map((cell) => `<${rowIndex === 0 ? "th" : "td"}>${(cell.content ?? []).map(renderRichNode).join("")}</${rowIndex === 0 ? "th" : "td"}>`).join("")}</tr>`,
      )
      .join("")}</table></div>`;
  if (node.type === "paragraph") return `<p>${renderInline(node.content)}</p>`;
  return renderInline(node.content);
}

function renderObject(
  object: CanvasObject,
  objects: Record<string, CanvasObject>,
  renderedDiagrams: ReadonlyMap<string, string>,
  currentCanvasId?: string,
): string {
  const style = object.appearance;
  const appearance = [
    style?.backgroundColor ? `background:${style.backgroundColor}` : "",
    style?.textColor ? `color:${style.textColor}` : "",
    style?.accentColor ? `border-color:${style.accentColor}` : "",
    style?.border === "none" ? "border-color:transparent" : "",
    style?.borderRadius !== undefined ? `border-radius:${style.borderRadius}px` : "",
    style?.padding !== undefined ? `padding:${style.padding}px` : "",
  ]
    .filter(Boolean)
    .join(";");
  let content = "";
  if (object.type === "richText")
    content = (object.data.document.content ?? []).map(renderRichNode).join("");
  else if (object.type === "image")
    content = `<figure class="image-fit-${object.data.fit}"><img src="${safeImageSrc(object.data.url)}" alt="${escapeHtml(object.data.alt)}">${object.data.caption ? `<figcaption>${escapeHtml(object.data.caption)}</figcaption>` : ""}</figure>`;
  else if (object.type === "table")
    content = `<div class="table-scroll"><table>${Array.from(
      { length: object.data.rows },
      (_, row) =>
        `<tr>${Array.from({ length: object.data.columns }, (_, column) => {
          const cell = object.data.cells[row * object.data.columns + column];
          const children = Object.values(objects)
            .filter(
              (candidate) => candidate.parentId === object.id && candidate.slotId === cell?.id,
            )
            .sort((left, right) => left.order - right.order);
          return `<${row === 0 ? "th" : "td"}>${escapeHtml(cell?.text ?? "")}${children.map((child) => renderObject(child, objects, renderedDiagrams, currentCanvasId)).join("")}</${row === 0 ? "th" : "td"}>`;
        }).join("")}</tr>`,
    ).join("")}</table></div>`;
  else if (object.type === "navigation") {
    const variant = object.data.variant ?? "button";
    const items = object.data.items ?? [];
    if (variant === "index") {
      content = `<nav class="embedded-index" aria-label="${escapeHtml(object.data.title || "Índice")}"><h3>${escapeHtml(object.data.title || "Índice")}</h3><ol>${items.map((item, index) => `<li><a href="#page-${escapeHtml(item.canvasId)}"${object.data.showCurrent !== false && item.canvasId === currentCanvasId ? ' aria-current="page"' : ""}><span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml(item.label)}</a></li>`).join("")}</ol></nav>`;
    } else if (variant === "bar") {
      const foundIndex = items.findIndex((item) => item.canvasId === currentCanvasId);
      const currentIndex = foundIndex >= 0 ? foundIndex : 0;
      const direction = (item: (typeof items)[number] | undefined, label: string) =>
        item
          ? `<a href="#page-${escapeHtml(item.canvasId)}"><small>${label}</small><strong>${escapeHtml(item.label)}</strong></a>`
          : `<span aria-disabled="true"><small>${label}</small><strong>—</strong></span>`;
      content = `<nav class="embedded-navigation-bar" aria-label="${escapeHtml(object.data.title || "Navegación")}">${direction(items[currentIndex - 1], "Anterior")}<p><strong>${escapeHtml(items[currentIndex]?.label ?? object.data.title ?? "Navegación")}</strong><small>${items.length ? `${currentIndex + 1} de ${items.length}` : "Sin páginas"}</small></p>${direction(items[currentIndex + 1], "Siguiente")}</nav>`;
    } else {
      const destination = object.data.destination;
      const href =
        destination.kind === "canvas"
          ? `#page-${escapeHtml(destination.canvasId)}`
          : safeHref(destination.url);
      content = `<a class="action ${object.data.style}" href="${href}"${object.data.openInNewTab && destination.kind === "external" ? ' target="_blank" rel="noreferrer"' : ""}>${escapeHtml(object.data.label || "Continuar")}</a>`;
    }
  } else if (object.type === "quiz") {
    const correct = object.data.options
      .filter((option) => option.correct)
      .map((option) => option.id)
      .sort()
      .join(",");
    const inputType = object.data.selectionMode === "multiple" ? "checkbox" : "radio";
    content = `<form class="quiz" data-correct="${escapeHtml(correct)}" data-explanation="${escapeHtml(object.data.showExplanation ? object.data.explanation : "")}"><fieldset><legend>${escapeHtml(object.data.question)}</legend>${object.data.options.map((option) => `<label><input type="${inputType}" name="quiz-${escapeHtml(object.id)}" value="${escapeHtml(option.id)}"> ${escapeHtml(option.label)}</label>`).join("")}</fieldset><button type="submit">Comprobar</button><p class="quiz-feedback" role="status"></p></form>`;
  } else if (object.type === "sorting") {
    const correct = escapeHtml(
      JSON.stringify(Object.fromEntries(object.data.items.map((item) => [item.id, item.targetId]))),
    );
    const order = escapeHtml(JSON.stringify(object.data.items.map((item) => item.id)));
    content = `<section class="sorting-export" data-sorting data-mode="${object.data.mode}" data-correct="${correct}" data-order="${order}"><h3>${escapeHtml(object.data.title)}</h3><p>${escapeHtml(object.data.prompt)}</p><div data-sorting-items>${object.data.items.map((item) => `<div data-sorting-item="${escapeHtml(item.id)}"><span>${escapeHtml(item.label)}</span>${object.data.mode === "order" ? `<button type="button" data-move="up" aria-label="Subir ${escapeHtml(item.label)}">↑</button><button type="button" data-move="down" aria-label="Bajar ${escapeHtml(item.label)}">↓</button>` : `<button type="button" data-select-item aria-pressed="false">Seleccionar</button>`}</div>`).join("")}</div>${object.data.mode === "order" ? "" : `<div data-sorting-targets>${object.data.targets.map((target) => `<button type="button" data-sorting-target="${escapeHtml(target.id)}">${escapeHtml(target.label)}</button>`).join("")}</div>`}<button type="button" data-sorting-check>Comprobar actividad</button><p data-sorting-feedback role="status"></p></section>`;
  } else if (object.type === "accordion") {
    content = `<section class="accordion"><h3>${escapeHtml(object.data.title)}</h3>${object.data.items.map((item) => `<details><summary>${escapeHtml(item.title)}</summary>${(item.content.content ?? []).map(renderRichNode).join("")}</details>`).join("")}</section>`;
  } else if (object.type === "tabs") {
    content = `<section class="tabs-export" data-tabs><h3>${escapeHtml(object.data.title)}</h3><div role="tablist">${object.data.items.map((item, index) => `<button type="button" role="tab" aria-selected="${index === 0}" data-tab-index="${index}">${escapeHtml(item.title)}</button>`).join("")}</div>${object.data.items.map((item, index) => `<div role="tabpanel"${index === 0 ? "" : " hidden"} data-tab-panel="${index}">${(item.content.content ?? []).map(renderRichNode).join("")}</div>`).join("")}</section>`;
  } else if (object.type === "flashcards") {
    content = `<section class="flashcards-export" data-flashcards data-card-index="0" data-card-side="front"><h3>${escapeHtml(object.data.title)}</h3><div class="flashcard-export-content">${object.data.cards.map((card, index) => `<article data-card="${index}"${index === 0 ? "" : " hidden"}><div data-side="front">${(card.front.content ?? []).map(renderRichNode).join("")}</div><div data-side="back" hidden>${(card.back.content ?? []).map(renderRichNode).join("")}</div></article>`).join("")}</div><div class="flashcard-export-actions"><button type="button" data-card-previous disabled>Anterior</button><button type="button" data-card-flip>Mostrar respuesta</button><button type="button" data-card-next${object.data.cards.length === 1 ? " disabled" : ""}>Siguiente</button></div><p aria-live="polite"><span data-card-position>1</span> de ${object.data.cards.length}</p></section>`;
  } else if (object.type === "timeline") {
    content = `<section class="timeline-export"><h3>${escapeHtml(object.data.title)}</h3><ol>${object.data.items.map((item) => `<li>${item.date ? `<time>${escapeHtml(item.date)}</time>` : ""}<h4>${escapeHtml(item.title)}</h4>${(item.content.content ?? []).map(renderRichNode).join("")}</li>`).join("")}</ol></section>`;
  } else if (object.type === "hotspots") {
    content = `<section class="hotspots-export" data-hotspots><h3>${escapeHtml(object.data.title)}</h3><div class="hotspots-export-stage" style="position:relative"><img src="${safeImageSrc(object.data.image.url)}" alt="${escapeHtml(object.data.image.alt)}">${object.data.hotspots.map((hotspot, index) => `<button type="button" style="position:absolute;left:${hotspot.xPercent}%;top:${hotspot.yPercent}%;transform:translate(-50%,-50%);width:34px;height:34px;border:3px solid white;border-radius:50%;color:white;background:#0666cc" data-hotspot="${index}" aria-label="Punto ${index + 1}: ${escapeHtml(hotspot.title)}">${index + 1}</button>`).join("")}</div>${object.data.hotspots.map((hotspot, index) => `<article data-hotspot-panel="${index}" hidden style="margin-top:14px;padding:16px;border:1px solid #ddd;border-radius:10px"><h4>${escapeHtml(hotspot.title)}</h4>${(hotspot.content.content ?? []).map(renderRichNode).join("")}</article>`).join("")}</section>`;
  } else if (object.type === "pele") {
    const svg = renderedDiagrams.get(object.id);
    content = svg
      ? `<figure class="diagram-export">${svg}${object.data.caption ? `<figcaption>${escapeHtml(object.data.caption)}</figcaption>` : ""}</figure>`
      : `<figure class="diagram-fallback"><pre>${escapeHtml(object.data.source)}</pre>${object.data.caption ? `<figcaption>${escapeHtml(object.data.caption)}</figcaption>` : ""}</figure>`;
  } else
    content = `<div class="diagram-fallback"><strong>Diagrama</strong><p>Escena Excalidraw con ${object.data.elements.length} elementos. Ábrela en KnowCanvas para editarla.</p></div>`;
  return `<article class="widget widget-${object.type}"${appearance ? ` style="${escapeHtml(appearance)}"` : ""}>${content}</article>`;
}

const EXPORT_THEME_CSS = `body{color:var(--theme-text);background:var(--theme-bg)}body,body.theme-minimal{--theme-bg:#f5f5f7;--theme-paper:#fff;--theme-text:#1d1d1f;--theme-muted:#666;--theme-accent:#5b5bd6;--theme-line:#ddd}body.theme-editorial{--theme-bg:#f2eadf;--theme-paper:#fffdf8;--theme-text:#33271f;--theme-muted:#735f50;--theme-accent:#9a4f2d;--theme-line:#dacbbb;font-family:Georgia,"Times New Roman",serif}body.theme-classroom{--theme-bg:#eef4ff;--theme-paper:#fff;--theme-text:#172554;--theme-muted:#52617d;--theme-accent:#2457d6;--theme-line:#cad8f5}body.theme-nature{--theme-bg:#eaf2e6;--theme-paper:#fbfdf9;--theme-text:#203428;--theme-muted:#587060;--theme-accent:#39704a;--theme-line:#c9d9c7}body.theme-night{--theme-bg:#17181c;--theme-paper:#24262d;--theme-text:#f5f7ff;--theme-muted:#b6bac8;--theme-accent:#8ea7ff;--theme-line:#3d414c}body aside,body .widget{color:var(--theme-text);border-color:var(--theme-line);background:var(--theme-paper)}body aside p,body .page>header p,body .page>header span,body .widget figcaption{color:var(--theme-muted)}body nav a{color:var(--theme-text)}body nav a.active{color:var(--theme-accent);background:color-mix(in srgb,var(--theme-accent) 12%,var(--theme-paper))}body .action.primary,body .quiz button{background:var(--theme-accent)}body .tabs-export [role=tab][aria-selected=true]{color:var(--theme-accent);border-color:var(--theme-accent)}body main>footer{border-color:var(--theme-line)}body.theme-night .action.secondary,body.theme-night footer button{color:var(--theme-text);background:#343741}`;

const EXPORT_IMAGE_CSS = `.widget-image figure{display:grid;grid-template-rows:minmax(0,1fr) auto;overflow:hidden}.widget-image figure img{width:100%;height:100%;max-height:560px}.widget-image .image-fit-contain img{object-fit:contain}.widget-image .image-fit-cover img{object-fit:cover}.widget-image .image-fit-fill img{object-fit:fill}`;

function renderHtml(
  project: ProjectDetail,
  scorm: boolean,
  renderedDiagrams: ReadonlyMap<string, string> = new Map(),
) {
  const pages = buildStudyPages(project.nodes);
  const canvases = new Map(project.canvases.map((canvas) => [canvas.id, canvas]));
  const sections = pages
    .map((page, index) => {
      const canvas = canvases.get(page.canvasId);
      const objects = canvas
        ? canvas.composition.rootIds
            .map((id) => canvas.composition.objects[id])
            .filter((item): item is CanvasObject => Boolean(item))
        : [];
      return `<section class="page" id="page-${escapeHtml(page.canvasId)}" data-index="${index}" ${index ? "hidden" : ""}><header><span>Página ${index + 1} de ${pages.length}</span><h1>${escapeHtml(page.title)}</h1>${canvas?.description ? `<p>${escapeHtml(canvas.description)}</p>` : ""}</header><div class="content">${objects.map((object) => renderObject(object, canvas?.composition.objects ?? {}, renderedDiagrams, page.canvasId)).join("") || '<p class="empty">Esta página no contiene elementos.</p>'}</div></section>`;
    })
    .join("");
  const nav = pages
    .map(
      (page, index) =>
        `<a href="#page-${escapeHtml(page.canvasId)}" data-index="${index}">${escapeHtml(page.title)}</a>`,
    )
    .join("");
  const scormRuntime = scorm
    ? `function findApi(w){for(let i=0;i<10&&w;i++,w=w.parent){if(w.API)return w.API}if(window.opener)return findApi(window.opener);return null}window.scormApi=findApi(window);if(window.scormApi){window.scormApi.LMSInitialize("");const status=window.scormApi.LMSGetValue("cmi.core.lesson_status");if(!status||status==="not attempted")window.scormApi.LMSSetValue("cmi.core.lesson_status","incomplete");window.addEventListener("beforeunload",()=>window.scormApi.LMSFinish(""))}`
    : "";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(project.name)}</title><style>${EXPORT_CSS}${EXPORT_THEME_CSS}${EXPORT_IMAGE_CSS}</style></head><body class="layout-${project.settings.viewerTemplate} theme-${project.settings.theme}"><a class="skip" href="#reader">Saltar al contenido</a><aside><strong>${escapeHtml(project.name)}</strong><p>${escapeHtml(project.description)}</p><nav aria-label="Índice">${nav}</nav></aside><main id="reader">${sections || '<section class="page"><h1>Libro vacío</h1><p>Este libro todavía no tiene páginas.</p></section>'}<footer><button id="previous">Anterior</button><span id="progress"></span><button id="next">Siguiente</button></footer></main><script>${scormRuntime}${EXPORT_JS}${QUIZ_MULTIPLE_EXPORT_JS}${SORTING_EXPORT_JS}</script></body></html>`;
}

const EXPORT_CSS = `:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1d1d1f;background:#f5f5f7;line-height:1.55}*{box-sizing:border-box}body{margin:0;display:grid;grid-template-columns:280px 1fr;min-height:100vh}aside{padding:32px 24px;border-right:1px solid #ddd;background:#fff}aside>strong{font-size:20px}aside p{color:#666;font-size:13px}nav{display:grid;gap:4px;margin-top:24px}nav a{padding:9px 10px;border-radius:8px;color:#333;text-decoration:none}nav a.active{background:#eaf3ff;color:#065ec4}main{width:min(900px,100%);margin:0 auto;padding:48px 40px}.page>header span{color:#777;font-size:12px}.page>header h1{font-size:clamp(32px,5vw,56px);letter-spacing:-.04em;margin:.15em 0}.page>header p{color:#666}.content{display:grid;gap:20px;margin-top:38px}.widget{padding:22px;border:1px solid #e4e4e7;border-radius:14px;background:#fff}.widget-richText{font-family:Georgia,serif;font-size:18px}.widget img,.diagram-export svg{display:block;max-width:100%;height:auto;margin:auto}.widget figure{margin:0}.widget figcaption{margin-top:8px;color:#666;font-size:13px}.table-scroll{overflow:auto}table{width:100%;border-collapse:collapse}th,td{padding:10px;border:1px solid #ddd;text-align:left}.action{display:inline-block;padding:10px 16px;border-radius:9px;text-decoration:none}.action.primary,.quiz button{color:#fff;background:#1d1d1f}.action.secondary{color:#1d1d1f;background:#eee}.embedded-index ol{display:grid;gap:5px;margin:0;padding:0;list-style:none}.embedded-index li a{display:grid;grid-template-columns:36px 1fr;min-height:44px;align-items:center}.embedded-index li a span{color:#777;font-size:11px}.embedded-index li a[aria-current=page]{color:#065ec4;background:#eaf3ff;font-weight:700}.embedded-navigation-bar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px}.embedded-navigation-bar>a,.embedded-navigation-bar>span{display:grid;min-height:52px;padding:8px 10px}.embedded-navigation-bar>a:last-child{text-align:right}.embedded-navigation-bar>span{opacity:.4}.embedded-navigation-bar p{display:grid;text-align:center}.embedded-navigation-bar small{color:#666}.quiz fieldset{display:grid;gap:10px;border:0;padding:0}.quiz legend{margin-bottom:12px;font-weight:700}.quiz button,footer button{border:0;border-radius:8px;padding:10px 14px;cursor:pointer}.quiz-feedback{min-height:24px}.sorting-export [data-sorting-items],.sorting-export [data-sorting-targets]{display:grid;gap:8px;margin:12px 0}.sorting-export [data-sorting-item]{display:flex;align-items:center;gap:8px;padding:9px;border:1px solid #ddd;border-radius:8px}.sorting-export [data-sorting-item]>span{flex:1}.sorting-export button{min-height:40px;padding:8px 12px;border:1px solid #ccc;border-radius:8px;background:#fff;cursor:pointer}.sorting-export [data-sorting-targets]{grid-template-columns:repeat(2,minmax(0,1fr))}.sorting-export [data-sorting-feedback]{min-height:24px}.tabs-export>[role=tablist]{display:flex;gap:4px;border-bottom:1px solid #ddd}.tabs-export [role=tab]{padding:9px 12px;border:0;border-bottom:2px solid transparent;background:transparent;cursor:pointer}.tabs-export [role=tab][aria-selected=true]{border-color:#0666cc;color:#065ec4}.tabs-export [role=tabpanel]{padding:16px 2px}.diagram-fallback{padding:18px;background:#f6f6f7;border-radius:10px}.diagram-fallback pre{white-space:pre-wrap}main>footer{display:flex;align-items:center;justify-content:space-between;margin-top:40px;padding-top:20px;border-top:1px solid #ddd}.layout-reader,.layout-magazine,.layout-presentation{display:block}.layout-reader aside,.layout-magazine aside,.layout-presentation aside{display:none}.layout-reader main{width:min(760px,100%)}.layout-magazine main{width:min(1180px,100%)}.layout-magazine .content{grid-template-columns:repeat(2,minmax(0,1fr))}.layout-magazine .widget-richText,.layout-magazine .widget-table{grid-column:1/-1}.layout-presentation main{width:min(1200px,100%);min-height:100vh;display:grid;align-content:center}.layout-presentation .page>header h1{font-size:clamp(42px,7vw,88px)}.skip{position:fixed;left:-999px}.skip:focus{left:10px;top:10px;z-index:2;background:#fff;padding:8px}@media(max-width:760px){body{display:block}aside{border-right:0;border-bottom:1px solid #ddd}main{padding:32px 18px}.widget{padding:16px}.layout-magazine .content{grid-template-columns:1fr}.layout-magazine .widget-richText,.layout-magazine .widget-table{grid-column:auto}.sorting-export [data-sorting-targets]{grid-template-columns:1fr}.embedded-navigation-bar{grid-template-columns:1fr 1fr}.embedded-navigation-bar p{grid-column:1/-1;grid-row:1}}`;

const EXPORT_JS = `const pages=[...document.querySelectorAll('.page[data-index]')],links=[...document.querySelectorAll('nav [data-index]')];let current=0;function show(index){current=Math.max(0,Math.min(pages.length-1,index));pages.forEach((p,i)=>p.hidden=i!==current);links.forEach((a,i)=>a.classList.toggle('active',i===current));document.querySelector('#progress').textContent=pages.length?(current+1)+' de '+pages.length:'0 de 0';document.querySelector('#previous').disabled=current===0;document.querySelector('#next').disabled=current>=pages.length-1;if(location.hash!=='#'+pages[current]?.id)history.replaceState(null,'','#'+(pages[current]?.id||''));if(window.scormApi){window.scormApi.LMSSetValue('cmi.core.lesson_location',String(current));if(current===pages.length-1)window.scormApi.LMSSetValue('cmi.core.lesson_status','completed');window.scormApi.LMSCommit('')}}function showHash(){const index=pages.findIndex(p=>'#'+p.id===location.hash);if(index>=0)show(index)}links.forEach(a=>a.addEventListener('click',e=>{e.preventDefault();show(Number(a.dataset.index))}));window.addEventListener('hashchange',showHash);document.querySelector('#previous').addEventListener('click',()=>show(current-1));document.querySelector('#next').addEventListener('click',()=>show(current+1));document.querySelectorAll('.quiz').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const selected=new FormData(form).get([...form.querySelectorAll('input')][0]?.name);const ok=selected===form.dataset.correct;form.querySelector('.quiz-feedback').textContent=(ok?'Correcto. ':'Revisa tu respuesta. ')+(form.dataset.explanation||'')}));document.querySelectorAll('[data-tabs]').forEach(group=>group.querySelectorAll('[data-tab-index]').forEach(tab=>tab.addEventListener('click',()=>{const index=tab.dataset.tabIndex;group.querySelectorAll('[data-tab-index]').forEach(button=>button.setAttribute('aria-selected',String(button===tab)));group.querySelectorAll('[data-tab-panel]').forEach(panel=>panel.hidden=panel.dataset.tabPanel!==index)})));document.querySelectorAll('[data-flashcards]').forEach(group=>{const cards=[...group.querySelectorAll('[data-card]')],previous=group.querySelector('[data-card-previous]'),next=group.querySelector('[data-card-next]'),flip=group.querySelector('[data-card-flip]'),position=group.querySelector('[data-card-position]');let index=0,side='front';function render(){cards.forEach((card,i)=>{card.hidden=i!==index;card.querySelector('[data-side=front]').hidden=side!=='front';card.querySelector('[data-side=back]').hidden=side!=='back'});previous.disabled=index===0;next.disabled=index===cards.length-1;flip.textContent=side==='front'?'Mostrar respuesta':'Volver a la pregunta';position.textContent=String(index+1)}previous.addEventListener('click',()=>{index--;side='front';render()});next.addEventListener('click',()=>{index++;side='front';render()});flip.addEventListener('click',()=>{side=side==='front'?'back':'front';render()});render()});document.querySelectorAll('[data-hotspots]').forEach(group=>group.querySelectorAll('[data-hotspot]').forEach(button=>button.addEventListener('click',()=>{const index=button.dataset.hotspot;group.querySelectorAll('[data-hotspot]').forEach(candidate=>candidate.setAttribute('aria-pressed',String(candidate===button)));group.querySelectorAll('[data-hotspot-panel]').forEach(panel=>panel.hidden=panel.dataset.hotspotPanel!==index)})));const hashIndex=pages.findIndex(p=>'#'+p.id===location.hash),savedIndex=window.scormApi?Number(window.scormApi.LMSGetValue('cmi.core.lesson_location')):NaN;show(hashIndex>=0?hashIndex:Number.isFinite(savedIndex)?savedIndex:0);`;

const QUIZ_MULTIPLE_EXPORT_JS = `document.addEventListener('submit',e=>{const form=e.target;if(!form.matches?.('.quiz')||!form.querySelector('input[type=checkbox]'))return;e.preventDefault();e.stopImmediatePropagation();const name=form.querySelector('input').name,selected=new FormData(form).getAll(name).map(String).sort().join(','),ok=selected===form.dataset.correct;form.querySelector('.quiz-feedback').textContent=(ok?'Correcto. ':'Revisa tu respuesta. ')+(form.dataset.explanation||'')},true);`;

const SORTING_EXPORT_JS = `document.querySelectorAll('[data-sorting]').forEach(group=>{const mode=group.dataset.mode,items=group.querySelector('[data-sorting-items]'),correct=JSON.parse(group.dataset.correct||'{}'),correctOrder=JSON.parse(group.dataset.order||'[]');let active=null,assignments={};if(mode==='order')[...items.children].reverse().forEach(item=>items.append(item));group.querySelectorAll('[data-select-item]').forEach(button=>button.addEventListener('click',()=>{active=button.parentElement.dataset.sortingItem;group.querySelectorAll('[data-select-item]').forEach(candidate=>candidate.setAttribute('aria-pressed',String(candidate===button)))}));group.querySelectorAll('[data-sorting-target]').forEach(target=>target.addEventListener('click',()=>{if(!active)return;if(mode==='match')Object.keys(assignments).forEach(key=>{if(assignments[key]===target.dataset.sortingTarget)delete assignments[key]});assignments[active]=target.dataset.sortingTarget;active=null;group.querySelectorAll('[data-select-item]').forEach(candidate=>candidate.setAttribute('aria-pressed','false'))}));group.querySelectorAll('[data-move]').forEach(button=>button.addEventListener('click',()=>{const row=button.parentElement,sibling=button.dataset.move==='up'?row.previousElementSibling:row.nextElementSibling;if(!sibling)return;if(button.dataset.move==='up')items.insertBefore(row,sibling);else items.insertBefore(sibling,row)}));group.querySelector('[data-sorting-check]').addEventListener('click',()=>{const ok=mode==='order'?[...items.children].every((row,index)=>row.dataset.sortingItem===correctOrder[index]):Object.keys(correct).every(key=>assignments[key]===correct[key]);group.querySelector('[data-sorting-feedback]').textContent=ok?'Actividad completada.':'Revisa la colocación.'})});`;

function scormManifest(project: ProjectDetail) {
  const title = escapeHtml(project.name);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<manifest identifier="KNOWCANVAS-${escapeHtml(project.id)}" version="1.0" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd"><metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata><organizations default="ORG-1"><organization identifier="ORG-1"><title>${title}</title><item identifier="ITEM-1" identifierref="RES-1"><title>${title}</title></item></organization></organizations><resources><resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index.html"><file href="index.html"/></resource></resources></manifest>`;
}

async function inlinePrivateImages(project: ProjectDetail) {
  const clone = structuredClone(project);
  const urls = new Set<string>();
  const collectRich = (node: RichTextNode) => {
    const image = embeddedImageData(node);
    if (image?.url.startsWith("/")) urls.add(image.url);
    for (const child of node.content ?? []) collectRich(child);
  };
  for (const canvas of clone.canvases) {
    for (const object of Object.values(canvas.composition.objects)) {
      if (object.type === "image" && object.data.url.startsWith("/")) urls.add(object.data.url);
      if (object.type === "richText") collectRich(object.data.document);
      if (object.type === "accordion" || object.type === "tabs")
        object.data.items.forEach((item) => collectRich(item.content));
      if (object.type === "flashcards")
        object.data.cards.forEach((card) => {
          collectRich(card.front);
          collectRich(card.back);
        });
      if (object.type === "timeline")
        object.data.items.forEach((item) => collectRich(item.content));
      if (object.type === "hotspots") {
        if (object.data.image.url.startsWith("/")) urls.add(object.data.image.url);
        object.data.hotspots.forEach((hotspot) => collectRich(hotspot.content));
      }
    }
  }
  const replacements = new Map<string, string>();
  await Promise.all(
    [...urls].map(async (url) => {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) throw new Error("No se pudo incluir una imagen privada en la exportación.");
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("No se pudo leer una imagen de la exportación."));
        reader.readAsDataURL(blob);
      });
      replacements.set(url, dataUrl);
    }),
  );
  const replaceRich = (node: RichTextNode) => {
    if (node.type === "image" && typeof node.attrs?.url === "string")
      node.attrs.url = replacements.get(node.attrs.url) ?? node.attrs.url;
    for (const child of node.content ?? []) replaceRich(child);
  };
  for (const canvas of clone.canvases) {
    for (const object of Object.values(canvas.composition.objects)) {
      if (object.type === "image")
        object.data.url = replacements.get(object.data.url) ?? object.data.url;
      if (object.type === "richText") replaceRich(object.data.document);
      if (object.type === "accordion" || object.type === "tabs")
        object.data.items.forEach((item) => replaceRich(item.content));
      if (object.type === "flashcards")
        object.data.cards.forEach((card) => {
          replaceRich(card.front);
          replaceRich(card.back);
        });
      if (object.type === "timeline")
        object.data.items.forEach((item) => replaceRich(item.content));
      if (object.type === "hotspots") {
        object.data.image.url = replacements.get(object.data.image.url) ?? object.data.image.url;
        object.data.hotspots.forEach((hotspot) => replaceRich(hotspot.content));
      }
    }
  }
  return clone;
}

async function renderPeleDiagrams(project: ProjectDetail) {
  const diagrams = project.canvases.flatMap((canvas) =>
    Object.values(canvas.composition.objects).filter(
      (object): object is Extract<CanvasObject, { type: "pele" }> => object.type === "pele",
    ),
  );
  const rendered = new Map<string, string>();
  if (diagrams.length === 0) return rendered;
  const { renderAsync } = await import("pele/lazy");
  await Promise.all(
    diagrams.map(async (diagram) => {
      try {
        const { svg } = await renderAsync(diagram.data.source, {
          links: false,
          images: false,
          limit: 50_000,
          outputLimit: 1_000_000,
          idPrefix: `knowcanvas-export-${diagram.id}`,
          responsive: true,
        });
        rendered.set(diagram.id, svg);
      } catch {
        // La fuente permanece como fallback legible si un diagrama no puede renderizarse.
      }
    }),
  );
  return rendered;
}

const fileName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/giu, "-")
    .replace(/^-|-$/gu, "")
    .toLowerCase() || "libro";

export async function exportProject(project: ProjectDetail, format: ExportFormat) {
  const portableProject = await inlinePrivateImages(project);
  const renderedDiagrams = await renderPeleDiagrams(portableProject);
  const scorm = format === "scorm12";
  const files = [
    { name: "index.html", content: renderHtml(portableProject, scorm, renderedDiagrams) },
  ];
  if (scorm) files.unshift({ name: "imsmanifest.xml", content: scormManifest(portableProject) });
  return {
    blob: createZip(files),
    fileName: `${fileName(project.name)}-${scorm ? "scorm-1-2" : "html"}.zip`,
  };
}

export const exportInternals = { renderHtml, scormManifest };
