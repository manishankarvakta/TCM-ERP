"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  List, 
  ListOrdered, 
  RemoveFormatting,
  Heading2,
  Heading3,
  Table as TableIcon,
  Plus,
  Trash2,
  Rows,
  Columns,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write notes here...",
  disabled = false,
  className,
  minHeight = "120px",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isInternalChange = useRef(false);

  // Table configuration state
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [hasHeader, setHasHeader] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isInTable, setIsInTable] = useState(false);

  // Sync content when external value changes
  useEffect(() => {
    if (editorRef.current) {
      if (!isInternalChange.current && editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
      isInternalChange.current = false;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      const html = editorRef.current.innerHTML;
      if (html === "<br>" || html === "<p><br></p>" || html.trim() === "") {
        onChange?.("");
      } else {
        onChange?.(html);
      }
    }
  }, [onChange]);

  // Check if cursor is currently inside a table
  const checkSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      setIsInTable(false);
      return;
    }
    const node = selection.anchorNode;
    if (!node) {
      setIsInTable(false);
      return;
    }
    const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    const table = element?.closest("table");
    setIsInTable(!!(table && editorRef.current?.contains(table)));
  }, []);

  const executeCommand = (command: string, val: string | undefined = undefined) => {
    if (disabled || !editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, val);
    handleInput();
  };

  const getActiveCellAndTable = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    const node = selection.anchorNode;
    if (!node) return null;
    const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    if (!element) return null;
    const cell = element.closest("td, th") as HTMLTableCellElement | null;
    const row = element.closest("tr") as HTMLTableRowElement | null;
    const table = element.closest("table") as HTMLTableElement | null;
    if (cell && row && table && editorRef.current?.contains(table)) {
      return { cell, row, table };
    }
    return null;
  };

  const handleCustomTableInsert = () => {
    if (disabled || !editorRef.current) return;

    const rows = Math.max(1, Math.min(50, Number(tableRows) || 1));
    const cols = Math.max(1, Math.min(20, Number(tableCols) || 1));

    let html = `<table style="width: 100%; border-collapse: collapse; margin: 8px 0;">`;
    
    if (hasHeader) {
      html += `<thead><tr>`;
      for (let c = 1; c <= cols; c++) {
        html += `<th style="border: 1px solid #cbd5e1; padding: 6px 10px; background-color: #f8fafc; text-align: left;">Header ${c}</th>`;
      }
      html += `</tr></thead>`;
    }

    html += `<tbody>`;
    const dataRowsCount = hasHeader ? Math.max(1, rows - 1) : rows;
    for (let r = 1; r <= dataRowsCount; r++) {
      html += `<tr>`;
      for (let c = 1; c <= cols; c++) {
        html += `<td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Cell ${r},${c}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table><p><br></p>`;

    editorRef.current.focus();
    document.execCommand("insertHTML", false, html);
    handleInput();
    setPopoverOpen(false);
  };

  const addRow = (direction: "above" | "below") => {
    const ctx = getActiveCellAndTable();
    if (!ctx) return;
    const { row } = ctx;
    const colCount = row.cells.length || 1;
    const newRow = document.createElement("tr");
    for (let i = 0; i < colCount; i++) {
      const td = document.createElement("td");
      td.style.border = "1px solid #cbd5e1";
      td.style.padding = "6px 10px";
      td.innerHTML = "Cell";
      newRow.appendChild(td);
    }
    if (direction === "above") {
      row.parentNode?.insertBefore(newRow, row);
    } else {
      row.parentNode?.insertBefore(newRow, row.nextSibling);
    }
    handleInput();
  };

  const addColumn = (direction: "left" | "right") => {
    const ctx = getActiveCellAndTable();
    if (!ctx) return;
    const { cell, table } = ctx;
    const colIndex = cell.cellIndex;
    const targetIndex = direction === "left" ? colIndex : colIndex + 1;

    Array.from(table.rows).forEach((r) => {
      const isHeader = r.parentElement?.tagName.toLowerCase() === "thead" || r.cells[0]?.tagName.toLowerCase() === "th";
      const newCell = document.createElement(isHeader ? "th" : "td");
      newCell.style.border = "1px solid #cbd5e1";
      newCell.style.padding = "6px 10px";
      if (isHeader) {
        newCell.style.backgroundColor = "#f8fafc";
        newCell.innerHTML = "Header";
      } else {
        newCell.innerHTML = "Cell";
      }
      if (targetIndex >= r.cells.length) {
        r.appendChild(newCell);
      } else {
        r.insertBefore(newCell, r.cells[targetIndex]);
      }
    });
    handleInput();
  };

  const deleteRow = () => {
    const ctx = getActiveCellAndTable();
    if (!ctx) return;
    ctx.row.remove();
    handleInput();
  };

  const deleteColumn = () => {
    const ctx = getActiveCellAndTable();
    if (!ctx) return;
    const { cell, table } = ctx;
    const colIndex = cell.cellIndex;
    Array.from(table.rows).forEach((r) => {
      if (r.cells[colIndex]) {
        r.cells[colIndex].remove();
      }
    });
    handleInput();
  };

  const deleteTable = () => {
    const ctx = getActiveCellAndTable();
    if (!ctx) return;
    ctx.table.remove();
    handleInput();
  };

  const isEmpty = !value || value === "<br>" || value === "<p><br></p>" || value.trim() === "";

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background text-sm ring-offset-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-1.5 rounded-t-md">
        {/* Text Sizing Dropdown */}
        <Select
          onValueChange={(val) => {
            if (val) executeCommand("fontSize", val);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 w-[110px] text-xs px-2 gap-1 bg-background border-border/80 focus:ring-0">
            <SelectValue placeholder="Font Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1" className="text-xs">10px (XS)</SelectItem>
            <SelectItem value="2" className="text-xs">12px (Small)</SelectItem>
            <SelectItem value="3" className="text-xs">14px (Normal)</SelectItem>
            <SelectItem value="4" className="text-xs">16px (Medium)</SelectItem>
            <SelectItem value="5" className="text-xs">18px (Large)</SelectItem>
            <SelectItem value="6" className="text-xs">24px (XL)</SelectItem>
            <SelectItem value="7" className="text-xs">32px (Huge)</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-4 w-[1px] bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => executeCommand("bold")}
          disabled={disabled}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => executeCommand("italic")}
          disabled={disabled}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => executeCommand("underline")}
          disabled={disabled}
          title="Underline (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => executeCommand("strikeThrough")}
          disabled={disabled}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <div className="h-4 w-[1px] bg-border mx-1" />

        {/* Text Alignment */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => executeCommand("justifyLeft")}
          disabled={disabled}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => executeCommand("justifyCenter")}
          disabled={disabled}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => executeCommand("justifyRight")}
          disabled={disabled}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => executeCommand("justifyFull")}
          disabled={disabled}
          title="Justify"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>

        <div className="h-4 w-[1px] bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => executeCommand("formatBlock", "<h2>")}
          disabled={disabled}
          title="Heading"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => executeCommand("formatBlock", "<h3>")}
          disabled={disabled}
          title="Subheading"
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <div className="h-4 w-[1px] bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => executeCommand("insertUnorderedList")}
          disabled={disabled}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => executeCommand("insertOrderedList")}
          disabled={disabled}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="h-4 w-[1px] bg-border mx-1" />

        {/* Table Control Popover */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0", isInTable && "bg-muted text-primary")}
              disabled={disabled}
              title="Table Operations (Insert / Add Rows & Columns)"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-3">
              {isInTable ? (
                <>
                  <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">
                    Modify Active Table
                  </h4>
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs justify-start"
                        onClick={() => addRow("above")}
                      >
                        <Rows className="mr-1.5 h-3.5 w-3.5" /> + Row Above
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs justify-start"
                        onClick={() => addRow("below")}
                      >
                        <Rows className="mr-1.5 h-3.5 w-3.5" /> + Row Below
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs justify-start"
                        onClick={() => addColumn("left")}
                      >
                        <Columns className="mr-1.5 h-3.5 w-3.5" /> + Col Left
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs justify-start"
                        onClick={() => addColumn("right")}
                      >
                        <Columns className="mr-1.5 h-3.5 w-3.5" /> + Col Right
                      </Button>
                    </div>

                    <div className="pt-2 border-t flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10 justify-start"
                        onClick={deleteRow}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Current Row
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10 justify-start"
                        onClick={deleteColumn}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Current Column
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10 justify-start"
                        onClick={deleteTable}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Entire Table
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">
                    Insert Table
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="rows-input" className="text-xs">
                        Rows
                      </Label>
                      <Input
                        id="rows-input"
                        type="number"
                        min={1}
                        max={50}
                        value={tableRows}
                        onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cols-input" className="text-xs">
                        Columns
                      </Label>
                      <Input
                        id="cols-input"
                        type="number"
                        min={1}
                        max={20}
                        value={tableCols}
                        onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="has-header"
                      checked={hasHeader}
                      onCheckedChange={(checked) => setHasHeader(!!checked)}
                    />
                    <Label htmlFor="has-header" className="text-xs cursor-pointer">
                      Include Header Row
                    </Label>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="w-full h-8 text-xs mt-1"
                    onClick={handleCustomTableInsert}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Insert Table
                  </Button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <div className="h-4 w-[1px] bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => executeCommand("removeFormat")}
          disabled={disabled}
          title="Clear Formatting"
        >
          <RemoveFormatting className="h-4 w-4" />
        </Button>
      </div>

      {/* Editable Content Container */}
      <div className="relative p-3">
        {isEmpty && !isFocused && (
          <div className="pointer-events-none absolute left-3 top-3 text-muted-foreground select-none">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={() => {
            handleInput();
            checkSelection();
          }}
          onKeyUp={checkSelection}
          onMouseUp={checkSelection}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{ minHeight }}
          className="outline-none prose prose-sm max-w-none dark:prose-invert focus:outline-none text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-muted-foreground/30 [&_th]:p-2 [&_th]:bg-muted/50 [&_td]:border [&_td]:border-muted-foreground/30 [&_td]:p-2 [&_font[size='1']]:text-[10px] [&_font[size='2']]:text-[12px] [&_font[size='3']]:text-[14px] [&_font[size='4']]:text-[16px] [&_font[size='5']]:text-[18px] [&_font[size='6']]:text-[24px] [&_font[size='7']]:text-[32px] [&_div[align='center']]:text-center [&_div[align='right']]:text-right [&_div[align='left']]:text-left [&_div[align='justify']]:text-justify [&_p[align='center']]:text-center [&_p[align='right']]:text-right [&_p[align='left']]:text-left [&_p[align='justify']]:text-justify"
        />
      </div>
    </div>
  );
}
