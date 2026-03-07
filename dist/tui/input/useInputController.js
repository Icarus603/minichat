import { useEffect, useRef, useState } from 'react';
import { useInput, useStdin } from 'ink';
import { filterCommandRegistry } from '../../app/commands/registry.js';
import { backspace, clearEditor, createInputEditorState, deleteForward, getRenderedLines, getViewportRenderedLines, insertText, moveDown, moveLeft, moveRight, moveToVisualLineEnd, moveToVisualLineStart, moveUp, revealPasteStart, setViewportSize, } from './textBuffer.js';
import { BRACKETED_PASTE_END, BRACKETED_PASTE_START, createPastePlaceholder, expandPastePlaceholders, isLargePaste, } from './paste.js';
import { isBackwardDelete, isForwardDelete, isFreeformTypingInput, isPaletteTypingInput } from './keymap.js';
import { useTerminalState } from '../contexts/TerminalContext.js';
const DOUBLE_ESCAPE_MS = 400;
export function useInputController({ onSend, loading, onInterrupt, onCommand, sessionsOpen, rewindOpen, modelPickerOpen, modelPickerStage, modelPickerLoading, modelOptions, modelSelectedIndex, modelQuery, modelEffortOptions, onRewindOpen, onRewindClose, onRewindMove, onRewindSelect, onModelMove, onModelSelect, onModelClose, onModelQueryChange, }) {
    const [editor, setEditor] = useState(createInputEditorState());
    const [showPalette, setShowPalette] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [pastedContent, setPastedContent] = useState({});
    const editorRef = useRef(editor);
    const pastedContentRef = useRef(pastedContent);
    const lastEscapeAtRef = useRef(0);
    const lastSequenceRef = useRef('');
    const rawPasteBufferRef = useRef('');
    const bracketedPasteBufferRef = useRef('');
    const bufferingBracketedPasteRef = useRef(false);
    const suppressRegularInputUntilRef = useRef(0);
    const { stdin } = useStdin();
    const terminal = useTerminalState();
    const inputWidth = Math.max(1, (terminal.columns || 80) - 4);
    const fullRenderedLineCount = getRenderedLines(editor, inputWidth).lines.length;
    const inputHeight = Math.max(1, fullRenderedLineCount);
    const viewportEditor = setViewportSize(editor, inputWidth, inputHeight);
    const { viewportLines, viewportCursorLineIndex, viewportCursorCharIndex, viewportCursorColumn, scrollRow, } = getViewportRenderedLines(viewportEditor, inputWidth, inputHeight);
    const useTerminalCursor = viewportEditor.viewportMode !== 'manual';
    const paletteQuery = editor.value.startsWith('/') ? editor.value.slice(1) : '';
    const commands = filterCommandRegistry(paletteQuery);
    const commitEditor = (nextEditor) => {
        editorRef.current = nextEditor;
        setEditor(nextEditor);
    };
    const commitPastedContent = (nextPastedContent) => {
        pastedContentRef.current = nextPastedContent;
        setPastedContent(nextPastedContent);
    };
    const clearInput = () => {
        commitEditor(setViewportSize(clearEditor(), inputWidth, inputHeight));
        commitPastedContent({});
    };
    const applyPastedText = (text) => {
        const currentEditor = editorRef.current;
        const currentPastedContent = pastedContentRef.current;
        const textToInsert = isLargePaste(text)
            ? createPastePlaceholder(text, currentPastedContent)
            : text;
        if (textToInsert !== text) {
            commitPastedContent({
                ...currentPastedContent,
                [textToInsert]: text,
            });
        }
        const inserted = insertText(currentEditor, textToInsert);
        const sized = setViewportSize(inserted, inputWidth, inputHeight);
        const next = textToInsert === text
            ? revealPasteStart(currentEditor, sized, inputWidth, inputHeight)
            : sized;
        commitEditor(next);
        suppressRegularInputUntilRef.current = Date.now() + 50;
    };
    useEffect(() => {
        editorRef.current = editor;
    }, [editor]);
    useEffect(() => {
        pastedContentRef.current = pastedContent;
    }, [pastedContent]);
    useEffect(() => {
        const handleData = (data) => {
            const raw = typeof data === 'string' ? data : data.toString('utf8');
            lastSequenceRef.current = raw;
            rawPasteBufferRef.current += raw;
            while (rawPasteBufferRef.current.length > 0) {
                if (!bufferingBracketedPasteRef.current) {
                    const startIndex = rawPasteBufferRef.current.indexOf(BRACKETED_PASTE_START);
                    if (startIndex === -1) {
                        rawPasteBufferRef.current = rawPasteBufferRef.current.slice(-(BRACKETED_PASTE_START.length - 1));
                        return;
                    }
                    bufferingBracketedPasteRef.current = true;
                    bracketedPasteBufferRef.current = '';
                    rawPasteBufferRef.current = rawPasteBufferRef.current.slice(startIndex + BRACKETED_PASTE_START.length);
                }
                const endIndex = rawPasteBufferRef.current.indexOf(BRACKETED_PASTE_END);
                if (endIndex === -1) {
                    bracketedPasteBufferRef.current += rawPasteBufferRef.current;
                    rawPasteBufferRef.current = '';
                    return;
                }
                bracketedPasteBufferRef.current += rawPasteBufferRef.current.slice(0, endIndex);
                const pastedText = bracketedPasteBufferRef.current;
                rawPasteBufferRef.current = rawPasteBufferRef.current.slice(endIndex + BRACKETED_PASTE_END.length);
                bufferingBracketedPasteRef.current = false;
                bracketedPasteBufferRef.current = '';
                if (pastedText.length > 0) {
                    applyPastedText(pastedText);
                }
            }
        };
        stdin.on('data', handleData);
        return () => {
            stdin.off('data', handleData);
        };
    }, [stdin, inputHeight, inputWidth]);
    useInput((input, key) => {
        if (bufferingBracketedPasteRef.current || Date.now() < suppressRegularInputUntilRef.current) {
            return;
        }
        const currentEditor = editorRef.current;
        const currentPastedContent = pastedContentRef.current;
        const sequence = lastSequenceRef.current;
        const backwardDelete = isBackwardDelete(sequence, input, key);
        const forwardDelete = isForwardDelete(sequence, backwardDelete, key);
        if (loading && key.escape) {
            onInterrupt();
            return;
        }
        if (sessionsOpen) {
            return;
        }
        if (rewindOpen) {
            if (key.escape)
                return void onRewindClose();
            if (key.upArrow)
                return void onRewindMove(-1);
            if (key.downArrow)
                return void onRewindMove(1);
            if (key.return)
                return void onRewindSelect();
            return;
        }
        if (modelPickerOpen) {
            if (key.upArrow)
                return void onModelMove(-1);
            if (key.downArrow)
                return void onModelMove(1);
            if (key.return && !modelPickerLoading)
                return void onModelSelect();
            if (key.escape)
                return void onModelClose();
            if (backwardDelete) {
                if (modelPickerStage === 'model') {
                    onModelQueryChange(modelQuery.slice(0, -1));
                }
                return;
            }
            if (modelPickerStage === 'model' && isFreeformTypingInput(input)) {
                onModelQueryChange(modelQuery + input);
            }
            return;
        }
        if (showPalette) {
            if (key.upArrow)
                return void setSelectedIndex((i) => Math.max(0, i - 1));
            if (key.downArrow)
                return void setSelectedIndex((i) => Math.min(commands.length - 1, i + 1));
            if (key.return) {
                const chosen = commands[selectedIndex];
                if (chosen) {
                    setShowPalette(false);
                    clearInput();
                    setSelectedIndex(0);
                    onCommand(chosen.name);
                }
                return;
            }
            if (key.escape) {
                lastEscapeAtRef.current = 0;
                setShowPalette(false);
                clearInput();
                setSelectedIndex(0);
                return;
            }
            if (backwardDelete) {
                const next = setViewportSize(backspace(currentEditor), inputWidth, inputHeight);
                commitEditor(next);
                setSelectedIndex(0);
                if (next.value === '')
                    setShowPalette(false);
                return;
            }
            if (forwardDelete) {
                const next = setViewportSize(deleteForward(currentEditor), inputWidth, inputHeight);
                commitEditor(next);
                setSelectedIndex(0);
                if (next.value === '')
                    setShowPalette(false);
                return;
            }
            if (key.leftArrow)
                return void commitEditor(setViewportSize(moveLeft(currentEditor), inputWidth, inputHeight));
            if (key.rightArrow)
                return void commitEditor(setViewportSize(moveRight(currentEditor), inputWidth, inputHeight));
            if (isPaletteTypingInput(input, key)) {
                commitEditor(setViewportSize(insertText(currentEditor, input), inputWidth, inputHeight));
                setSelectedIndex(0);
            }
            return;
        }
        if (input === '/' && currentEditor.value === '') {
            commitEditor(setViewportSize(insertText(clearEditor(), '/'), inputWidth, inputHeight));
            setShowPalette(true);
            setSelectedIndex(0);
            return;
        }
        if (key.escape) {
            const now = Date.now();
            const isDoubleEscape = now - lastEscapeAtRef.current <= DOUBLE_ESCAPE_MS;
            lastEscapeAtRef.current = now;
            if (isDoubleEscape) {
                if (currentEditor.value.length === 0) {
                    onRewindOpen();
                }
                else {
                    clearInput();
                }
                lastEscapeAtRef.current = 0;
            }
            return;
        }
        lastEscapeAtRef.current = 0;
        if (key.return && !key.shift) {
            const text = expandPastePlaceholders(currentEditor.value, currentPastedContent).trim();
            if (text) {
                onSend(text);
                clearInput();
            }
            return;
        }
        if (key.return && key.shift)
            return void commitEditor(setViewportSize(insertText(currentEditor, '\n'), inputWidth, inputHeight));
        if (key.leftArrow)
            return void commitEditor(setViewportSize(moveLeft(currentEditor), inputWidth, inputHeight));
        if (key.rightArrow)
            return void commitEditor(setViewportSize(moveRight(currentEditor), inputWidth, inputHeight));
        if (key.upArrow) {
            const rendered = getRenderedLines(currentEditor, inputWidth);
            if (rendered.cursorColumn > 0) {
                return void commitEditor(setViewportSize(moveToVisualLineStart(currentEditor, inputWidth), inputWidth, inputHeight));
            }
            return void commitEditor(setViewportSize(moveUp(currentEditor, inputWidth), inputWidth, inputHeight));
        }
        if (key.downArrow) {
            const rendered = getRenderedLines(currentEditor, inputWidth);
            const currentLine = rendered.lines[rendered.cursorLineIndex] ?? '';
            const atVisualLineEnd = rendered.cursorCharIndex >= Array.from(currentLine).length;
            if (!atVisualLineEnd) {
                return void commitEditor(setViewportSize(moveToVisualLineEnd(currentEditor, inputWidth), inputWidth, inputHeight));
            }
            return void commitEditor(setViewportSize(moveDown(currentEditor, inputWidth), inputWidth, inputHeight));
        }
        if (backwardDelete)
            return void commitEditor(setViewportSize(backspace(currentEditor), inputWidth, inputHeight));
        if (forwardDelete)
            return void commitEditor(setViewportSize(deleteForward(currentEditor), inputWidth, inputHeight));
        if (isFreeformTypingInput(input)) {
            const textToInsert = input.length > 1 && isLargePaste(input)
                ? createPastePlaceholder(input, currentPastedContent)
                : input;
            if (textToInsert !== input) {
                commitPastedContent({
                    ...currentPastedContent,
                    [textToInsert]: input,
                });
            }
            const inserted = insertText(currentEditor, textToInsert);
            const sized = setViewportSize(inserted, inputWidth, inputHeight);
            const next = textToInsert === input && (input.length > 1 || input.includes('\n'))
                ? revealPasteStart(currentEditor, sized, inputWidth, inputHeight)
                : sized;
            commitEditor(next);
        }
        lastSequenceRef.current = '';
    });
    return {
        editor: viewportEditor,
        showPalette,
        selectedIndex,
        inputWidth,
        inputHeight,
        viewportLines,
        viewportCursorLineIndex,
        viewportCursorCharIndex,
        viewportCursorColumn,
        scrollRow,
        useTerminalCursor,
        paletteQuery,
        commands,
    };
}
