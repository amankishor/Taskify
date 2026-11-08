import React,{useEffect,useRef} from 'react';
import {useEditor,EditorContent} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {Markdown} from '@tiptap/markdown';
import Image from '@tiptap/extension-image';
import {TableKit} from '@tiptap/extension-table';
import Placeholder from '@tiptap/extension-placeholder';
export default function RichText({value,onChange,onBlur,onReady,onSelection,onImage,disabled}){
 const latest=useRef({onChange,onBlur,onSelection,onImage});latest.current={onChange,onBlur,onSelection,onImage};const instance=useRef(null);
 const editor=useEditor({
  extensions:[StarterKit.configure({link:{openOnClick:false},underline:false}),Markdown,Image.configure({allowBase64:false}),TableKit.configure({table:{resizable:false}}),Placeholder.configure({placeholder:'Start with a thought. See where it goes…'})],
  content:value,contentType:'markdown',editable:!disabled,
  editorProps:{attributes:{role:'textbox','aria-label':'Note content','aria-multiline':'true',class:'rich-note'},handlePaste:(_,event)=>{
   const image=Array.from(event.clipboardData?.files||[]).find(f=>f.type.startsWith('image/'));
   if(image){latest.current.onImage(image);return true;}
   const text=event.clipboardData?.getData('text/plain')||'';
   if(!event.clipboardData?.getData('text/html')&&/(^|\n)(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|\|)|\*\*[^*]+\*\*|!\[/.test(text)){instance.current?.commands.insertContent(text,{contentType:'markdown'});return true;}return false;
  }},
  onUpdate:({editor})=>latest.current.onChange(editor.getMarkdown()),onBlur:()=>latest.current.onBlur(),onSelectionUpdate:()=>latest.current.onSelection(),onTransaction:()=>latest.current.onSelection()
 });
 useEffect(()=>{instance.current=editor;onReady(editor);return()=>onReady(null);},[editor,onReady]);
 useEffect(()=>{if(editor&&editor.getMarkdown()!==value)editor.commands.setContent(value,{contentType:'markdown',emitUpdate:false});},[editor,value]);
 useEffect(()=>{editor?.setEditable(!disabled);},[editor,disabled]);
 return <EditorContent editor={editor} className="rich-editor-host"/>;
}
