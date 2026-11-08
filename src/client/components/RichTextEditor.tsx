import {
  Bold,
  ChevronRight,
  Code2,
  Ellipsis,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link,
  List,
  Quote,
  Radical,
  RemoveFormatting,
  Strikethrough,
  Table2,
  Type,
  Underline,
  Unlink,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  createEmbeddedImageNode,
  documentToMarkdown,
  embeddedImageData,
  markdownToDocument,
  type EmbeddedImageData,
} from "../../domain/rich-text";
import type { RichTextMark, RichTextNode } from "../../shared/contracts";
import { api } from "../api";
import { prepareImage } from "../resources/images";
import { ImagePicker, type SelectedImage } from "./ImagePicker";
import { Popover } from "./ui/Popover";

interface RichTextEditorProps {
  value: RichTextNode;
  ariaLabel?: string;
  autoFocus?: boolean;
  toolbarMode?: "contextual" | "fixed";
  readOnly?: boolean;
  internalPages?: { id: string; title: string }[];
  onChange: (value: RichTextNode, contentHeight?: number) => void;
  onCommit?: () => void;
  onInteractionModeChange?: (toolActive: boolean) => void;
  onEmbeddedImageSelect?: (image: EmbeddedImageData | null) => void;
}

function imageNodes(documentValue: RichTextNode) {
  const images: RichTextNode[] = [];
  const visit = (node: RichTextNode) => {
    if (node.type === "image") images.push(node);
    for (const child of node.content ?? []) visit(child);
  };
  visit(documentValue);
  return images;
}

const fontFamilies = {
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  arial: "Arial, sans-serif",
  verdana: "Verdana, sans-serif",
} as const;

type FontFamilyKey = keyof typeof fontFamilies;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderRichInline(nodes: RichTextNode[] = []) {
  return nodes
    .map((node) => {
      let html = escapeHtml(node.text ?? "").replaceAll("\n", "<br>");
      for (const mark of node.marks ?? []) {
        if (mark.type === "bold") html = `<strong>${html}</strong>`;
        if (mark.type === "italic") html = `<em>${html}</em>`;
        if (mark.type === "underline") html = `<u>${html}</u>`;
        if (mark.type === "strike") html = `<s>${html}</s>`;
        if (mark.type === "code") html = `<code>${html}</code>`;
        if (mark.type === "link") html = `<a href="${escapeHtml(mark.href ?? "")}">${html}</a>`;
        if (mark.type === "textStyle") {
          const styles = [
            mark.color ? `color:${mark.color}` : "",
            mark.fontFamily && mark.fontFamily in fontFamilies
              ? `font-family:${fontFamilies[mark.fontFamily as FontFamilyKey]}`
              : "",
            mark.fontSize ? `font-size:${mark.fontSize}px` : "",
          ]
            .filter(Boolean)
            .join(";");
          if (styles) html = `<span data-text-style="true" style="${styles}">${html}</span>`;
        }
      }
      return html;
    })
    .join("");
}

function renderRichBlock(node: RichTextNode): string {
  if (node.type === "image") {
    const image = embeddedImageData(node);
    if (!image) return "";
    return `<p><img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}"></p>`;
  }
  if (node.type === "heading") {
    const level = Number(node.attrs?.level) === 3 ? 3 : 2;
    return `<h${level}>${renderRichInline(node.content) || "<br>"}</h${level}>`;
  }
  if (node.type === "blockquote")
    return `<blockquote>${(node.content ?? []).map(renderRichBlock).join("")}</blockquote>`;
  if (node.type === "bulletList")
    return `<ul>${(node.content ?? []).map((item) => `<li>${(item.content ?? []).map((child) => renderRichInline(child.content)).join("")}</li>`).join("")}</ul>`;
  if (node.type === "table")
    return `<table>${(node.content ?? [])
      .map(
        (row, rowIndex) =>
          `<tr>${(row.content ?? []).map((cell) => `<${rowIndex === 0 ? "th" : "td"}>${(cell.content ?? []).map((child) => renderRichInline(child.content)).join("") || "&nbsp;"}</${rowIndex === 0 ? "th" : "td"}>`).join("")}</tr>`,
      )
      .join("")}</table>`;
  return `<p>${renderRichInline(node.content) || "<br>"}</p>`;
}

function documentToEditorHtml(documentValue: RichTextNode) {
  const container = document.createElement("div");
  container.innerHTML = (documentValue.content ?? []).map(renderRichBlock).join("");
  const elements = Array.from(container.querySelectorAll("img"));
  imageNodes(documentValue).forEach((node, index) => {
    const image = embeddedImageData(node);
    const element = elements[index];
    if (!image || !element) return;
    element.dataset.nodeId = image.id;
    element.dataset.resourceId = image.resourceId ?? "";
    element.dataset.caption = image.caption;
    element.dataset.alignment = image.alignment;
    element.style.width = `${image.width}px`;
    element.style.maxWidth = "100%";
  });
  return container.innerHTML;
}

function normalizeColor(value: string) {
  const probe = document.createElement("span");
  probe.style.color = value;
  if (!probe.style.color) return undefined;
  document.body.append(probe);
  const rgb = getComputedStyle(probe).color.match(/\d+/gu)?.slice(0, 3).map(Number);
  probe.remove();
  if (!rgb || rgb.length !== 3) return undefined;
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function fontFamilyKey(value: string): FontFamilyKey | undefined {
  const normalized = value.toLowerCase();
  if (normalized.includes("georgia") || normalized.includes("times")) return "serif";
  if (normalized.includes("mono") || normalized.includes("menlo")) return "mono";
  if (normalized.includes("arial")) return "arial";
  if (normalized.includes("verdana")) return "verdana";
  if (normalized.includes("system") || normalized.includes("segoe")) return "system";
  return undefined;
}

function inlineNodesFromDom(node: Node, inherited: RichTextMark[] = []): RichTextNode[] {
  if (node.nodeType === Node.TEXT_NODE)
    return node.textContent ? [{ type: "text", text: node.textContent, marks: inherited }] : [];
  if (!(node instanceof HTMLElement)) return [];
  if (node.tagName === "BR") return [{ type: "text", text: "\n", marks: inherited }];

  const marks = [...inherited];
  if (node.matches("strong, b")) marks.push({ type: "bold" });
  if (node.matches("em, i")) marks.push({ type: "italic" });
  if (node.matches("u")) marks.push({ type: "underline" });
  if (node.matches("s, strike")) marks.push({ type: "strike" });
  if (node.matches("code")) marks.push({ type: "code" });
  if (node instanceof HTMLAnchorElement) marks.push({ type: "link", href: node.href });

  const color = normalizeColor(
    node.style.color || (node instanceof HTMLFontElement ? (node.getAttribute("color") ?? "") : ""),
  );
  const family = fontFamilyKey(
    node.style.fontFamily || (node instanceof HTMLFontElement ? node.face : ""),
  );
  const parsedSize = Number.parseInt(node.style.fontSize, 10);
  const fontSize = Number.isFinite(parsedSize) ? Math.min(72, Math.max(10, parsedSize)) : undefined;
  if (color || family || fontSize)
    marks.push({
      type: "textStyle",
      ...(color ? { color } : {}),
      ...(family ? { fontFamily: family } : {}),
      ...(fontSize ? { fontSize } : {}),
    });

  return Array.from(node.childNodes).flatMap((child) => inlineNodesFromDom(child, marks));
}

function editorHtmlToDocument(element: HTMLElement) {
  const parseBlock = (block: HTMLElement): RichTextNode | null => {
    const image = block.matches("img") ? block : block.querySelector(":scope > img:only-child");
    if (image instanceof HTMLImageElement)
      return createEmbeddedImageNode({
        ...(image.dataset.nodeId ? { id: image.dataset.nodeId } : {}),
        resourceId: image.dataset.resourceId || null,
        url: image.getAttribute("src") ?? "",
        alt: image.getAttribute("alt") ?? "",
        caption: image.dataset.caption ?? "",
        width: Math.max(80, Math.round(image.getBoundingClientRect().width || 480)),
        alignment:
          image.dataset.alignment === "left" || image.dataset.alignment === "right"
            ? image.dataset.alignment
            : "center",
      });
    if (block.matches("h2, h3"))
      return {
        type: "heading",
        attrs: { level: block.tagName === "H3" ? 3 : 2 },
        content: inlineNodesFromDom(block),
      };
    if (block.matches("blockquote"))
      return {
        type: "blockquote",
        content: [{ type: "paragraph", content: inlineNodesFromDom(block) }],
      };
    if (block.matches("ul"))
      return {
        type: "bulletList",
        content: Array.from(block.children)
          .filter((child): child is HTMLLIElement => child instanceof HTMLLIElement)
          .map((item) => ({
            type: "listItem",
            content: [{ type: "paragraph", content: inlineNodesFromDom(item) }],
          })),
      };
    if (block instanceof HTMLTableElement)
      return {
        type: "table",
        content: Array.from(block.rows).map((row) => ({
          type: "tableRow",
          content: Array.from(row.cells).map((cell) => ({
            type: "tableCell",
            content: [{ type: "paragraph", content: inlineNodesFromDom(cell) }],
          })),
        })),
      };
    return { type: "paragraph", content: inlineNodesFromDom(block) };
  };

  return {
    type: "doc",
    content: Array.from(element.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement)
      .map(parseBlock)
      .filter((node): node is RichTextNode => node !== null),
  };
}

function imageElementData(element: HTMLImageElement): EmbeddedImageData {
  const alignment = element.dataset.alignment;
  return {
    id: element.dataset.nodeId || globalThis.crypto.randomUUID(),
    resourceId: element.dataset.resourceId || null,
    url: element.getAttribute("src") ?? "",
    alt: element.getAttribute("alt") ?? "",
    caption: element.dataset.caption ?? "",
    width: Math.max(80, Math.round(element.getBoundingClientRect().width || 480)),
    alignment: alignment === "left" || alignment === "right" ? alignment : "center",
  };
}

export function RichTextPreview({ value }: { value: RichTextNode }) {
  const html = useMemo(() => documentToEditorHtml(value), [value]);
  return <div className="rich-text-preview" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function RichTextEditor({
  value,
  ariaLabel = "Contenido del bloque",
  autoFocus = true,
  toolbarMode = "contextual",
  readOnly = false,
  internalPages = [],
  onChange,
  onCommit,
  onInteractionModeChange,
  onEmbeddedImageSelect,
}: RichTextEditorProps) {
  const [showCode, setShowCode] = useState(false);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [selectionMenu, setSelectionMenu] = useState<{
    left: number;
    top: number;
    placement: "above" | "below";
  } | null>(null);
  const [selectionBlockLabel, setSelectionBlockLabel] = useState("Texto");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const linkButton = useRef<HTMLButtonElement>(null);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [pasteState, setPasteState] = useState<
    { kind: "idle" } | { kind: "uploading"; count: number } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [imageSelectionBounds, setImageSelectionBounds] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const editor = useRef<HTMLDivElement>(null);
  const savedSelection = useRef<Range | null>(null);
  const selectedLink = useRef<HTMLAnchorElement | null>(null);
  const selectedImage = useRef<HTMLImageElement | null>(null);
  const selectedTableCell = useRef<HTMLTableCellElement | null>(null);
  const markdownValue = useMemo(() => documentToMarkdown(value), [value]);
  const previewHtml = useMemo(() => documentToEditorHtml(value), [value]);
  const interactionModeCallback = useRef(onInteractionModeChange);
  interactionModeCallback.current = onInteractionModeChange;
  const toolActive =
    imagePickerOpen || selectionMenu !== null || slashQuery !== null || linkPopoverOpen;

  useEffect(() => {
    setShowCode(false);
    if (!readOnly) return;
    setSelectionMenu(null);
    setSlashQuery(null);
    setLinkPopoverOpen(false);
    setMoreOptionsOpen(false);
    setImagePickerOpen(false);
    selectedLink.current = null;
    selectedImage.current = null;
    onEmbeddedImageSelect?.(null);
  }, [readOnly]);
  useEffect(() => {
    const element = editor.current;
    if (!element || (document.activeElement && element.contains(document.activeElement))) return;
    const selectedId = selectedImage.current?.dataset.nodeId;
    const html = documentToEditorHtml(value);
    if (element.innerHTML !== html) element.innerHTML = html;
    if (selectedId) {
      const nextImage = Array.from(element.querySelectorAll("img")).find(
        (candidate) => candidate.dataset.nodeId === selectedId,
      );
      selectEmbeddedImage(nextImage ?? null);
    }
  }, [readOnly, showCode, value]);
  useEffect(() => {
    if (readOnly || showCode || !autoFocus) return;
    const frame = requestAnimationFrame(() => editor.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [autoFocus, readOnly, showCode]);
  useEffect(() => {
    interactionModeCallback.current?.(toolActive);
  }, [toolActive]);
  useEffect(
    () => () => {
      interactionModeCallback.current?.(false);
    },
    [],
  );

  function emitRichText() {
    const element = editor.current;
    if (!element) return;
    onChange(editorHtmlToDocument(element), Math.ceil(element.scrollHeight));
    const selection = window.getSelection();
    let block = selection?.anchorNode;
    if (block?.nodeType === Node.TEXT_NODE) block = block.parentNode;
    const blockElement = block instanceof HTMLElement ? block.closest("p, div, h2, h3") : null;
    const text = blockElement?.textContent ?? "";
    setSlashQuery(text.startsWith("/") ? text.slice(1).toLowerCase() : null);
  }

  function captureSelection() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editor.current) return;
    const range = selection.getRangeAt(0);
    if (editor.current.contains(range.commonAncestorContainer)) {
      savedSelection.current = range.cloneRange();
    }
  }

  function selectEmbeddedImage(element: HTMLImageElement | null) {
    selectedImage.current = element;
    if (!element) {
      setImageSelectionBounds(null);
      onEmbeddedImageSelect?.(null);
      return;
    }
    if (!element.dataset.nodeId) element.dataset.nodeId = globalThis.crypto.randomUUID();
    const bounds = element.getBoundingClientRect();
    setImageSelectionBounds({
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    });
    onEmbeddedImageSelect?.(imageElementData(element));
  }

  function beginEmbeddedImageResize(
    event: React.PointerEvent<HTMLButtonElement>,
    direction: "nw" | "ne" | "se" | "sw",
  ) {
    const image = selectedImage.current;
    const container = editor.current;
    if (!image || !container) return;
    event.preventDefault();
    event.stopPropagation();
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const bounds = image.getBoundingClientRect();
    const naturalRatio = image.naturalWidth / Math.max(1, image.naturalHeight);
    const ratio =
      image.naturalHeight > 0
        ? naturalRatio
        : bounds.height > 24
          ? bounds.width / bounds.height
          : 1;
    const containerStyle = window.getComputedStyle(container);
    const availableWidth =
      container.clientWidth -
      Number.parseFloat(containerStyle.paddingLeft || "0") -
      Number.parseFloat(containerStyle.paddingRight || "0");
    let changed = false;
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      const horizontal = direction.includes("e")
        ? moveEvent.clientX - startX
        : startX - moveEvent.clientX;
      const vertical = direction.includes("s")
        ? (moveEvent.clientY - startY) * ratio
        : (startY - moveEvent.clientY) * ratio;
      const delta = Math.abs(horizontal) >= Math.abs(vertical) ? horizontal : vertical;
      const width = Math.min(availableWidth, Math.max(80, bounds.width + delta));
      image.style.width = `${Math.round(width)}px`;
      changed = true;
      const nextBounds = image.getBoundingClientRect();
      setImageSelectionBounds({
        left: nextBounds.left,
        top: nextBounds.top,
        width: nextBounds.width,
        height: nextBounds.height,
      });
    };
    const finish = (finishEvent: PointerEvent) => {
      if (finishEvent.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      if (changed) {
        emitRichText();
        onEmbeddedImageSelect?.(imageElementData(image));
      }
    };
    const cancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      image.style.width = `${Math.round(bounds.width)}px`;
      selectEmbeddedImage(image);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
  }

  function showContextMenu(options?: {
    left: number;
    top: number;
    allowCollapsed?: boolean;
    label?: string;
  }) {
    captureSelection();
    const selection = window.getSelection();
    const range = savedSelection.current;
    const element = editor.current;
    selectedLink.current = null;
    setLinkDraft("");
    for (const link of element?.querySelectorAll("a") ?? []) {
      link.removeAttribute("data-link-active");
    }
    if (!selection || !range || !element || (range.collapsed && !options?.allowCollapsed)) {
      setSelectionMenu(null);
      setLinkPopoverOpen(false);
      setMoreOptionsOpen(false);
      return;
    }
    const bounds = range.getBoundingClientRect();
    const menuWidth = 284;
    const estimatedMenuHeight = moreOptionsOpen ? 260 : 190;
    const belowTop = options?.top ?? bounds.bottom + 6;
    const placement = window.innerHeight - belowTop >= estimatedMenuHeight ? "below" : "above";
    setSelectionMenu({
      left: Math.max(8, Math.min(window.innerWidth - menuWidth - 8, options?.left ?? bounds.left)),
      top: placement === "below" ? belowTop : Math.max(8, (options?.top ?? bounds.top) - 4),
      placement,
    });

    let startNode: Node | null = range.startContainer;
    if (startNode.nodeType === Node.TEXT_NODE) startNode = startNode.parentNode;
    const block =
      startNode instanceof HTMLElement ? startNode.closest("li, h2, h3, blockquote, p") : null;
    setSelectionBlockLabel(
      options?.label ??
        (block?.tagName === "LI"
          ? "Lista con viñetas"
          : block?.tagName === "H2"
            ? "Encabezado 2"
            : block?.tagName === "H3"
              ? "Encabezado 3"
              : block?.tagName === "BLOCKQUOTE"
                ? "Cita"
                : "Texto"),
    );
    const candidate = startNode instanceof HTMLElement ? startNode.closest("a") : null;
    selectedLink.current = candidate?.contains(range.endContainer) ? candidate : null;
    selectedLink.current?.setAttribute("data-link-active", "true");
    setLinkDraft(selectedLink.current?.getAttribute("href") ?? "");
    if (!selectedLink.current) setLinkPopoverOpen(false);
  }

  function restoreSelection() {
    const selection = window.getSelection();
    const range = savedSelection.current;
    if (!selection || !range || !editor.current?.contains(range.commonAncestorContainer)) {
      return selection;
    }
    editor.current.focus();
    selection.removeAllRanges();
    selection.addRange(range);
    return selection;
  }

  function command(name: string, argument?: string) {
    restoreSelection();
    document.execCommand(name, false, argument);
    captureSelection();
    emitRichText();
    setSelectionMenu(null);
    setMoreOptionsOpen(false);
  }

  function applyTextStyle(style: {
    color?: string;
    fontFamily?: FontFamilyKey;
    fontSize?: number;
  }) {
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    if (style.color) document.execCommand("foreColor", false, style.color);
    if (style.fontFamily) document.execCommand("fontName", false, fontFamilies[style.fontFamily]);
    if (style.fontSize) {
      document.execCommand("fontSize", false, "7");
      for (const element of editor.current?.querySelectorAll('font[size="7"]') ?? []) {
        if (!(element instanceof HTMLElement)) continue;
        element.removeAttribute("size");
        element.style.fontSize = `${style.fontSize}px`;
      }
      for (const element of editor.current?.querySelectorAll<HTMLElement>('[style*="font-size"]') ??
        []) {
        if (element.style.fontSize === "xxx-large") element.style.fontSize = `${style.fontSize}px`;
      }
    }
    captureSelection();
    emitRichText();
  }

  function insertTable() {
    const selection = restoreSelection();
    const range = savedSelection.current;
    const container = editor.current;
    if (!selection || !range || !container || !container.contains(range.commonAncestorContainer))
      return;

    const table = document.createElement("table");
    table.innerHTML =
      "<thead><tr><th>Columna 1</th><th>Columna 2</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody>";
    const trailingParagraph = document.createElement("p");
    trailingParagraph.append(document.createElement("br"));

    let selectedBlock: HTMLElement | null = range.startContainer as HTMLElement;
    if (selectedBlock.nodeType === Node.TEXT_NODE) selectedBlock = selectedBlock.parentElement;
    selectedBlock = selectedBlock?.closest("p, h2, h3, blockquote, li") ?? null;

    range.deleteContents();
    if (
      selectedBlock &&
      container.contains(selectedBlock) &&
      !selectedBlock.textContent?.trim() &&
      selectedBlock.querySelector("img, table") === null
    ) {
      selectedBlock.replaceWith(table, trailingParagraph);
    } else if (selectedBlock && container.contains(selectedBlock)) {
      selectedBlock.after(table, trailingParagraph);
    } else {
      range.insertNode(trailingParagraph);
      range.insertNode(table);
    }

    const firstCell = table.querySelector("td");
    if (firstCell) {
      const caret = document.createRange();
      caret.selectNodeContents(firstCell);
      caret.collapse(true);
      selection.removeAllRanges();
      selection.addRange(caret);
      savedSelection.current = caret.cloneRange();
    }
    emitRichText();
    setSelectionMenu(null);
    setMoreOptionsOpen(false);
  }

  function handleBlur(event: React.FocusEvent<HTMLElement>) {
    const nextTarget = event.relatedTarget;
    if (
      nextTarget instanceof Element &&
      nextTarget.closest(
        ".widget-window, .text-selection-menu, .embedded-image-selection, .resource-picker, .modal-backdrop",
      )
    )
      return;
    onCommit?.();
  }

  function placeCaretInEmptyTableCell(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as Element;
    const cell = target.closest("td");
    selectedTableCell.current = cell instanceof HTMLTableCellElement ? cell : null;
    if (!cell || cell.textContent?.trim()) return;
    event.preventDefault();
    placeCaretInCell(cell);
  }

  function placeCaretInCell(cell: HTMLTableCellElement) {
    editor.current?.focus();
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    savedSelection.current = range.cloneRange();
  }

  function editLink() {
    restoreSelection();
    setLinkPopoverOpen(true);
  }

  function applyLink(destination: string) {
    const href = destination.startsWith("#canvas=")
      ? destination
      : /^https?:\/\//u.test(destination)
        ? destination
        : `https://${destination}`;
    if (selectedLink.current && editor.current?.contains(selectedLink.current)) {
      selectedLink.current.setAttribute("href", href);
    } else {
      restoreSelection();
      document.execCommand("createLink", false, href);
    }
    emitRichText();
    setLinkPopoverOpen(false);
    setSelectionMenu(null);
    selectedLink.current = null;
  }

  function removeLink() {
    if (selectedLink.current && editor.current?.contains(selectedLink.current)) {
      selectedLink.current.replaceWith(...selectedLink.current.childNodes);
      emitRichText();
    } else {
      restoreSelection();
      document.execCommand("unlink");
      emitRichText();
    }
    setLinkPopoverOpen(false);
    setSelectionMenu(null);
    selectedLink.current = null;
  }

  function openImagePicker() {
    captureSelection();
    setSelectionMenu(null);
    setMoreOptionsOpen(false);
    setImagePickerOpen(true);
  }

  function insertInlineImage(image: SelectedImage) {
    const selection = restoreSelection();
    const range = savedSelection.current;
    if (!selection || !range || !editor.current?.contains(range.commonAncestorContainer)) return;
    const imageNode = embeddedImageData(createEmbeddedImageNode({ ...image }));
    if (!imageNode) return;
    const element = document.createElement("img");
    element.src = image.url;
    element.alt = image.alt;
    element.dataset.resourceId = image.resourceId ?? "";
    element.dataset.nodeId = imageNode.id;
    element.dataset.caption = "";
    element.dataset.alignment = "center";
    element.style.width = `${imageNode.width}px`;
    element.style.maxWidth = "100%";
    const imageBlock = document.createElement("p");
    imageBlock.append(element);
    let current: Node | null = range.commonAncestorContainer;
    if (current.nodeType === Node.TEXT_NODE) current = current.parentNode;
    const block =
      current instanceof HTMLElement ? current.closest("p, h2, h3, blockquote, li") : null;
    if (block && editor.current.contains(block)) {
      if (block.textContent?.trim()) block.after(imageBlock);
      else block.replaceWith(imageBlock);
    } else {
      range.deleteContents();
      range.insertNode(imageBlock);
    }
    const trailingParagraph = document.createElement("p");
    trailingParagraph.append(document.createElement("br"));
    imageBlock.after(trailingParagraph);
    range.selectNodeContents(trailingParagraph);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    savedSelection.current = range.cloneRange();
    emitRichText();
    selectedImage.current = element;
    onEmbeddedImageSelect?.(imageElementData(element));
    setImagePickerOpen(false);
  }

  async function pasteClipboardImages(event: React.ClipboardEvent<HTMLDivElement>) {
    const imageFiles = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (imageFiles.length === 0) return;

    event.preventDefault();
    event.stopPropagation();
    captureSelection();
    setSelectionMenu(null);
    setSlashQuery(null);
    setLinkPopoverOpen(false);
    setPasteState({ kind: "uploading", count: imageFiles.length });

    try {
      for (const [index, clipboardFile] of imageFiles.entries()) {
        const fileName = clipboardFile.name.trim() || `imagen-pegada-${index + 1}.png`;
        const file = new File([clipboardFile], fileName, {
          type: clipboardFile.type,
          lastModified: clipboardFile.lastModified,
        });
        const prepared = await prepareImage(file);
        const resource = await api.uploadResource(
          prepared.blob,
          prepared.name,
          prepared.width,
          prepared.height,
        );
        insertInlineImage({
          resourceId: resource.id,
          url: resource.url,
          alt: `Imagen pegada ${imageFiles.length > 1 ? index + 1 : ""}`.trim(),
        });
      }
      setPasteState({ kind: "idle" });
    } catch (cause) {
      setPasteState({
        kind: "error",
        message:
          cause instanceof Error
            ? cause.message
            : "No se pudo guardar la imagen pegada en Google Drive.",
      });
    }
  }

  function applySlashCommand(type: "heading" | "list" | "quote" | "link" | "table" | "image") {
    const selection = restoreSelection();
    let block = selection?.anchorNode;
    if (block?.nodeType === Node.TEXT_NODE) block = block.parentNode;
    const blockElement = block instanceof HTMLElement ? block.closest("p, div, h2, h3") : null;
    if (!blockElement || !editor.current?.contains(blockElement)) return;
    const replaceBlock = (replacement: HTMLElement) => {
      if (blockElement === editor.current) editor.current.replaceChildren(replacement);
      else blockElement.replaceWith(replacement);
    };
    if (type === "image") {
      const paragraph = document.createElement("p");
      paragraph.append(document.createElement("br"));
      replaceBlock(paragraph);
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
      captureSelection();
      emitRichText();
      setSlashQuery(null);
      setImagePickerOpen(true);
      return;
    }
    if (type === "table") {
      const wrapper = document.createElement("div");
      wrapper.innerHTML =
        "<table><thead><tr><th>Columna 1</th><th>Columna 2</th></tr></thead><tbody><tr><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td></tr></tbody></table>";
      const table = wrapper.firstElementChild;
      if (table instanceof HTMLElement) replaceBlock(table);
      emitRichText();
      setSlashQuery(null);
      return;
    }

    let target: HTMLElement;
    if (type === "list") {
      const list = document.createElement("ul");
      target = document.createElement("li");
      target.append(document.createElement("br"));
      list.append(target);
      replaceBlock(list);
    } else {
      target = document.createElement(
        type === "heading" ? "h2" : type === "quote" ? "blockquote" : "p",
      );
      if (type === "link") {
        const link = document.createElement("a");
        link.href = "https://";
        link.textContent = "texto";
        target.append(link);
      } else {
        target.append(document.createElement("br"));
      }
      replaceBlock(target);
    }

    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(type !== "link");
    selection?.removeAllRanges();
    selection?.addRange(range);
    editor.current.focus();
    captureSelection();
    emitRichText();
    setSlashQuery(null);
  }

  const slashCommands = [
    { label: "Encabezado", keywords: "titulo heading", type: "heading" as const },
    { label: "Lista", keywords: "viñetas bullets", type: "list" as const },
    { label: "Cita", keywords: "quote", type: "quote" as const },
    { label: "Enlace", keywords: "link url", type: "link" as const },
    { label: "Tabla", keywords: "filas columnas table", type: "table" as const },
    { label: "Imagen", keywords: "foto recurso image", type: "image" as const },
  ].filter(({ label, keywords }) =>
    `${label} ${keywords}`.toLowerCase().includes(slashQuery ?? ""),
  );

  if (readOnly)
    return <div className="rich-text-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />;

  const preserveSelection = (event: React.MouseEvent) => {
    captureSelection();
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <section className="rich-text-editor" aria-label={`Editor de ${ariaLabel.toLowerCase()}`}>
      {imageSelectionBounds
        ? createPortal(
            <div
              className="embedded-image-selection"
              aria-label="Imagen seleccionada dentro del contenido"
              style={{
                left: imageSelectionBounds.left,
                top: imageSelectionBounds.top,
                width: imageSelectionBounds.width,
                height: imageSelectionBounds.height,
              }}
            >
              {(["nw", "ne", "se", "sw"] as const).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  className={`embedded-image-resize-handle ${direction}`}
                  aria-label={`Redimensionar imagen interna ${direction}`}
                  onPointerDown={(event) => beginEmbeddedImageResize(event, direction)}
                />
              ))}
            </div>,
            document.body,
          )
        : null}
      {showCode ? (
        <div className="markdown-source-wrap">
          <button type="button" onClick={() => setShowCode(false)}>
            Volver al texto enriquecido
          </button>
          <textarea
            autoFocus={autoFocus}
            className="markdown-source"
            value={markdownValue}
            onChange={(event) => onChange(markdownToDocument(event.target.value))}
            onBlur={handleBlur}
            aria-label="Código Markdown"
          />
        </div>
      ) : (
        <div className="rich-text-input-wrap">
          {toolbarMode === "fixed" ? (
            <div
              className="rich-text-fixed-toolbar"
              role="toolbar"
              aria-label={`Formato de ${ariaLabel.toLowerCase()}`}
              onMouseDown={(event) => {
                captureSelection();
                if (event.target instanceof Element && event.target.closest("button"))
                  preserveSelection(event);
              }}
            >
              <button type="button" onClick={() => command("formatBlock", "p")} aria-label="Texto">
                <Type size={16} />
              </button>
              <button
                type="button"
                onClick={() => command("formatBlock", "h2")}
                aria-label="Encabezado"
              >
                <Heading2 size={16} />
              </button>
              <label className="rich-text-format-select">
                <span className="sr-only">Tipo de letra</span>
                <select
                  aria-label="Tipo de letra"
                  defaultValue="system"
                  onChange={(event) =>
                    applyTextStyle({ fontFamily: event.target.value as FontFamilyKey })
                  }
                >
                  <option value="system">Sistema</option>
                  <option value="serif">Serif</option>
                  <option value="mono">Monoespaciada</option>
                  <option value="arial">Arial</option>
                  <option value="verdana">Verdana</option>
                </select>
              </label>
              <label className="rich-text-format-select is-size">
                <span className="sr-only">Tamaño de letra</span>
                <select
                  aria-label="Tamaño de letra"
                  defaultValue="16"
                  onChange={(event) => applyTextStyle({ fontSize: Number(event.target.value) })}
                >
                  {[12, 14, 16, 18, 24, 32, 40].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rich-text-color-control" title="Color del texto">
                <span className="rich-text-color-letter" aria-hidden="true">
                  A
                </span>
                <input
                  type="color"
                  defaultValue="#1d1d1f"
                  aria-label="Color del texto"
                  onChange={(event) => applyTextStyle({ color: event.target.value })}
                />
              </label>
              <button type="button" onClick={() => command("bold")} aria-label="Negrita">
                <Bold size={16} />
              </button>
              <button type="button" onClick={() => command("italic")} aria-label="Cursiva">
                <Italic size={16} />
              </button>
              <button type="button" onClick={() => command("underline")} aria-label="Subrayado">
                <Underline size={16} />
              </button>
              <button type="button" onClick={() => command("strikeThrough")} aria-label="Tachado">
                <Strikethrough size={16} />
              </button>
              <button
                ref={linkButton}
                type="button"
                onClick={editLink}
                aria-label="Enlace"
                aria-haspopup="dialog"
                aria-expanded={linkPopoverOpen}
              >
                <Link size={16} />
              </button>
              <button
                type="button"
                onClick={() => command("insertUnorderedList")}
                aria-label="Lista"
              >
                <List size={16} />
              </button>
              <button
                type="button"
                onClick={() => command("formatBlock", "blockquote")}
                aria-label="Cita"
              >
                <Quote size={16} />
              </button>
              <button
                type="button"
                onClick={() => command("formatBlock", "pre")}
                aria-label="Código"
              >
                <Code2 size={16} />
              </button>
              <button type="button" onClick={insertTable} aria-label="Insertar tabla">
                <Table2 size={16} />
              </button>
              <button type="button" onClick={openImagePicker} aria-label="Insertar imagen">
                <ImageIcon size={16} />
              </button>
              <button
                type="button"
                onClick={() => command("removeFormat")}
                aria-label="Borrar formato"
              >
                <RemoveFormatting size={16} />
              </button>
              <button type="button" onClick={() => setShowCode(true)} aria-label="Ver Markdown">
                <Code2 size={16} />
              </button>
            </div>
          ) : null}
          {selectionMenu && toolbarMode === "contextual"
            ? createPortal(
                <div
                  className="text-selection-menu"
                  role="toolbar"
                  aria-label="Formato del texto seleccionado"
                  style={{
                    left: selectionMenu.left,
                    top: selectionMenu.top,
                    transform:
                      selectionMenu.placement === "above" ? "translateY(-100%)" : undefined,
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
                  }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    className="text-menu-block-type"
                    type="button"
                    onClick={() => command("formatBlock", "p")}
                    aria-label="Convertir en texto"
                  >
                    {selectionBlockLabel === "Lista con viñetas" ? (
                      <List size={20} />
                    ) : (
                      <Type size={20} />
                    )}
                    <span>{selectionBlockLabel}</span>
                    <ChevronRight size={17} />
                  </button>
                  <div className="text-menu-divider" />
                  <div className="text-menu-actions" aria-label="Acciones de formato">
                    <button
                      className="text-color-action"
                      type="button"
                      aria-label="Color del texto"
                    >
                      A
                    </button>
                    <button type="button" onClick={() => command("bold")} aria-label="Negrita">
                      <Bold size={20} />
                    </button>
                    <button type="button" onClick={() => command("italic")} aria-label="Cursiva">
                      <Italic size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => command("underline")}
                      aria-label="Subrayado"
                    >
                      <Underline size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => command("removeFormat")}
                      aria-label="Borrar formato"
                    >
                      <RemoveFormatting size={20} />
                    </button>
                    <button
                      ref={linkButton}
                      type="button"
                      onClick={editLink}
                      aria-label="Enlace"
                      aria-haspopup="dialog"
                      aria-expanded={linkPopoverOpen}
                      aria-controls={linkPopoverOpen ? "rich-text-link-popover" : undefined}
                    >
                      <Link size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => command("strikeThrough")}
                      aria-label="Tachado"
                    >
                      <Strikethrough size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => command("formatBlock", "pre")}
                      aria-label="Código"
                    >
                      <Code2 size={20} />
                    </button>
                    <button type="button" disabled aria-label="Fórmula" title="Próximamente">
                      <Radical size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoreOptionsOpen((open) => !open)}
                      aria-label="Más opciones"
                      aria-expanded={moreOptionsOpen}
                    >
                      <Ellipsis size={21} />
                    </button>
                  </div>
                  {moreOptionsOpen ? (
                    <div className="text-menu-more-actions" aria-label="Más acciones de formato">
                      <button type="button" onClick={() => command("formatBlock", "h2")}>
                        <Heading2 size={18} /> Encabezado
                      </button>
                      <button type="button" onClick={() => command("insertUnorderedList")}>
                        <List size={18} /> Lista
                      </button>
                      <button type="button" onClick={() => command("formatBlock", "blockquote")}>
                        <Quote size={18} /> Cita
                      </button>
                      <button type="button" aria-label="Insertar tabla" onClick={insertTable}>
                        <Table2 size={18} /> Tabla
                      </button>
                      <button type="button" onClick={() => setShowCode(true)}>
                        <Code2 size={18} /> Ver Markdown
                      </button>
                      <button type="button" onClick={openImagePicker}>
                        <ImageIcon size={18} /> Imagen
                      </button>
                    </div>
                  ) : null}
                  {linkPopoverOpen ? (
                    <Popover
                      id="rich-text-link-popover"
                      className="link-popover"
                      label="Crear enlace"
                      onDismiss={() => setLinkPopoverOpen(false)}
                      returnFocusRef={linkButton}
                    >
                      <label>
                        <Link size={15} />
                        <input
                          data-autofocus
                          value={linkDraft}
                          placeholder="Pega o escribe una URL"
                          aria-label="URL del enlace"
                          onChange={(event) => setLinkDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && linkDraft.trim())
                              applyLink(linkDraft.trim());
                          }}
                        />
                        <button
                          type="button"
                          aria-label="Aplicar enlace"
                          disabled={!linkDraft.trim()}
                          onClick={() => applyLink(linkDraft.trim())}
                        >
                          Aplicar
                        </button>
                      </label>
                      <div className="link-page-list" role="listbox" aria-label="Páginas del libro">
                        <span>Páginas del libro</span>
                        {internalPages
                          .filter((page) =>
                            page.title.toLowerCase().includes(linkDraft.toLowerCase()),
                          )
                          .map((page) => (
                            <button
                              type="button"
                              role="option"
                              aria-selected="false"
                              key={page.id}
                              onClick={() => applyLink(`#canvas=${page.id}`)}
                            >
                              {page.title}
                            </button>
                          ))}
                      </div>
                      {selectedLink.current ? (
                        <button className="remove-context-link" type="button" onClick={removeLink}>
                          <Unlink size={14} /> Quitar enlace
                        </button>
                      ) : null}
                    </Popover>
                  ) : null}
                </div>,
                document.body,
              )
            : null}
          {linkPopoverOpen && toolbarMode === "fixed" ? (
            <Popover
              id="rich-text-fixed-link-popover"
              className="link-popover"
              label="Crear enlace"
              onDismiss={() => setLinkPopoverOpen(false)}
              returnFocusRef={linkButton}
            >
              <label>
                <Link size={15} />
                <input
                  data-autofocus
                  value={linkDraft}
                  placeholder="Pega o escribe una URL"
                  aria-label="URL del enlace"
                  onChange={(event) => setLinkDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && linkDraft.trim()) applyLink(linkDraft.trim());
                  }}
                />
                <button
                  type="button"
                  aria-label="Aplicar enlace"
                  disabled={!linkDraft.trim()}
                  onClick={() => applyLink(linkDraft.trim())}
                >
                  Aplicar
                </button>
              </label>
              <div className="link-page-list" role="listbox" aria-label="Páginas del libro">
                <span>Páginas del libro</span>
                {internalPages
                  .filter((page) => page.title.toLowerCase().includes(linkDraft.toLowerCase()))
                  .map((page) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      key={page.id}
                      onClick={() => applyLink(`#canvas=${page.id}`)}
                    >
                      {page.title}
                    </button>
                  ))}
              </div>
            </Popover>
          ) : null}
          <div
            ref={editor}
            autoFocus
            className="rich-text-input"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label={ariaLabel}
            aria-busy={pasteState.kind === "uploading"}
            data-placeholder="Empieza a escribir… Usa / para insertar"
            onPaste={(event) => void pasteClipboardImages(event)}
            onMouseDown={placeCaretInEmptyTableCell}
            onInput={emitRichText}
            onLoadCapture={(event) => {
              if (event.target instanceof HTMLImageElement) emitRichText();
            }}
            onBlur={handleBlur}
            onKeyUp={(event) => {
              if (["Escape", "Backspace", "Delete"].includes(event.key)) return;
              showContextMenu();
            }}
            onMouseUp={(event) => {
              if (event.button === 0) showContextMenu();
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const target = event.target as Element;
              const selectedElement = target.closest("img, table, a");
              if (selectedElement instanceof HTMLImageElement) {
                selectEmbeddedImage(selectedElement);
              } else {
                selectEmbeddedImage(null);
              }
              if (selectedElement && editor.current?.contains(selectedElement)) {
                const range = document.createRange();
                if (selectedElement.tagName === "A") range.selectNodeContents(selectedElement);
                else range.selectNode(selectedElement);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
                savedSelection.current = range.cloneRange();
              } else {
                const rangeAtPoint = document.caretRangeFromPoint?.(event.clientX, event.clientY);
                if (
                  rangeAtPoint &&
                  editor.current?.contains(rangeAtPoint.commonAncestorContainer)
                ) {
                  const selection = window.getSelection();
                  selection?.removeAllRanges();
                  selection?.addRange(rangeAtPoint);
                  savedSelection.current = rangeAtPoint.cloneRange();
                } else {
                  captureSelection();
                }
              }
              showContextMenu({
                left: event.clientX,
                top: event.clientY + 4,
                allowCollapsed: true,
                ...(selectedElement?.tagName === "IMG"
                  ? { label: "Imagen" }
                  : selectedElement?.tagName === "TABLE"
                    ? { label: "Tabla" }
                    : {}),
              });
            }}
            onClick={(event) => {
              const cell = (event.target as Element).closest("td, th");
              if (cell instanceof HTMLTableCellElement && editor.current?.contains(cell)) {
                selectedTableCell.current = cell;
                if (!cell.textContent?.trim()) placeCaretInCell(cell);
                return;
              }
              const embeddedElement = (event.target as Element).closest("img, table");
              if (embeddedElement && editor.current?.contains(embeddedElement)) {
                if (embeddedElement instanceof HTMLImageElement) {
                  selectEmbeddedImage(embeddedElement);
                } else {
                  selectEmbeddedImage(null);
                }
                const range = document.createRange();
                range.selectNode(embeddedElement);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
                savedSelection.current = range.cloneRange();
                const bounds = embeddedElement.getBoundingClientRect();
                showContextMenu({
                  left: bounds.left,
                  top: bounds.bottom + 6,
                  allowCollapsed: true,
                  label: embeddedElement.tagName === "IMG" ? "Imagen" : "Tabla",
                });
                return;
              }
              selectEmbeddedImage(null);
              const link = (event.target as Element).closest("a");
              if (!link) return;
              event.preventDefault();
              event.stopPropagation();
              const range = document.createRange();
              range.selectNodeContents(link);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              selectedLink.current = link as HTMLAnchorElement;
              savedSelection.current = range.cloneRange();
              setLinkDraft(link.getAttribute("href") ?? "");
              showContextMenu();
              setLinkPopoverOpen(true);
            }}
            onKeyDown={(event) => {
              const cell = selectedTableCell.current;
              const selection = window.getSelection();
              if (
                cell &&
                editor.current?.contains(cell) &&
                (!selection?.anchorNode || !cell.contains(selection.anchorNode))
              )
                placeCaretInCell(cell);
              if ((event.key === "Backspace" || event.key === "Delete") && selectedImage.current) {
                event.preventDefault();
                event.stopPropagation();
                const image = selectedImage.current;
                const block = image.closest("p");
                if (block && block.childNodes.length === 1) block.remove();
                else image.remove();
                selectEmbeddedImage(null);
                emitRichText();
                return;
              }
              if (
                event.key === "Escape" &&
                (selectionMenu || slashQuery !== null || linkPopoverOpen)
              ) {
                event.preventDefault();
                event.stopPropagation();
                setSelectionMenu(null);
                setSlashQuery(null);
                setLinkPopoverOpen(false);
                setMoreOptionsOpen(false);
                return;
              }
              if (event.key === "Escape" && selectedImage.current) {
                event.preventDefault();
                event.stopPropagation();
                selectEmbeddedImage(null);
              }
            }}
          />
          {pasteState.kind === "uploading" ? (
            <p className="rich-text-paste-status" role="status" aria-live="polite">
              Guardando {pasteState.count === 1 ? "la imagen" : `${pasteState.count} imágenes`} en
              Google Drive…
            </p>
          ) : pasteState.kind === "error" ? (
            <p className="rich-text-paste-status is-error" role="alert">
              {pasteState.message}
            </p>
          ) : null}
          {slashQuery !== null ? (
            <div className="slash-menu" role="listbox" aria-label="Comandos de texto">
              {slashCommands.map((slashCommand) => (
                <button
                  key={slashCommand.label}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onMouseDown={preserveSelection}
                  onClick={() => applySlashCommand(slashCommand.type)}
                >
                  {slashCommand.label}
                </button>
              ))}
              {slashCommands.length === 0 ? <span>Sin resultados</span> : null}
            </div>
          ) : null}
        </div>
      )}
      {imagePickerOpen
        ? createPortal(
            <ImagePicker onClose={() => setImagePickerOpen(false)} onSelect={insertInlineImage} />,
            document.body,
          )
        : null}
    </section>
  );
}
