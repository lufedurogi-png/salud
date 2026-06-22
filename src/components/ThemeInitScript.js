/** Aplica el tema guardado antes del primer pintado (evita parpadeo). */
export default function ThemeInitScript() {
    const script = `(function(){try{var k='darkMode',v=localStorage.getItem(k);if(v==='false')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark');}catch(e){}})();`

    return <script dangerouslySetInnerHTML={{ __html: script }} />
}
