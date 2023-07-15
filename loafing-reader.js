// ==UserScript==
// @name         摸鱼小说阅读器 Loafing-Reader
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  内嵌浏览器里用来上班摸鱼看小说
// @author       HanaYabuki
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==
(function () {
    const css = {
        '*': {
            margin: '0',
            padding: '0',
            boxSizing: 'content-box',
            fontSize: '12px',
        },
        'panel': {
            height: '27em',
            width: '48em',
            backgroundColor: '#aa000000',
            top: '50%',
            left: '50%',
            zIndex: '10',
            position: 'fixed',
            border: '1px solid #ffffff',
            display: 'flex',
            flexFlow: 'column nowrap',
            userSelect: 'none',
        },
        'toolbar': {
            backgroundColor: '#e7dec633',
            width: '100%',
            height: '18px',
        },
        'jump': {
            color: '#00f'
        },
        'load': {
            color: '#00f',
        },
        'move': {
            color: '#00f',
        },
        'info': {
            color: '#000'
        },
        'content': {
            color: '#000000',
            backgroundColor: '#f7eed633',
            flex: '1',
            padding: '0 0.5em',
            overflow: 'hidden',
        },
        'text': {
            backgroundColor: '#ff000000',
            position: 'relative',
        },
        'fileholder': {
            display: 'none',
        }
    };

    //
    const elements = {};
    function create(tagName, clazz, id) {
        const tmp = document.createElement(tagName);
        if (clazz) tmp.className = clazz;
        if (id) tmp.id = id;
        return tmp;
    }
    elements.panel = create('div')
    elements.toolbar = create('div');
    elements.content = create('div');
    elements.jump = create('span');
    elements.load = create('span');
    elements.move = create('span');
    elements.info = create('span');
    elements.fileholder = create('input');
    elements.text = create('div');

    elements.jump.href = '#'; elements.jump.innerText = '[跳转]';
    elements.load.href = '#'; elements.load.innerText = '[加载]';
    elements.move.href = '#'; elements.move.innerText = '[移动]';
    elements.fileholder.type = 'file';
    elements.fileholder.accept = '.txt';
    elements.info.innerText = '(无文件)';

    document.documentElement.appendChild(elements.panel);
    elements.panel.appendChild(elements.toolbar);
    elements.panel.appendChild(elements.content);
    elements.toolbar.appendChild(elements.jump);
    elements.toolbar.appendChild(elements.load);
    elements.toolbar.appendChild(elements.move);
    elements.toolbar.appendChild(elements.info);
    elements.toolbar.appendChild(elements.fileholder);
    elements.content.appendChild(elements.text);

    // file handle
    const fileInfo = {};

    function loadFile(filename, content) {
        clear();
        fileInfo.fileName = filename.substring(0, filename.lastIndexOf('.'));
        fileInfo.content = content.split(/(?:\r\n|\n)/)//.filter(s=>/\s*/.test(s));
        fileInfo.length = fileInfo.content.length;
        fileInfo.bookmark = 0;
        fileInfo.page = [];

        GM_setValue('lf_file_name', filename);
        GM_setValue('lf_file_content', content);
        GM_setValue('lf_bookmark', 0);

        jump(0);
    }

    // utils
    function updateInfo() {
        const filename = fileInfo.fileName;
        elements.info.innerText = `(${fileInfo.bookmark}/${fileInfo.length})-${filename}`;

        GM_setValue('lf_bookmark', fileInfo.bookmark);
    }
    function clear() {
        const ls = fileInfo.page;
        while (ls && ls.length > 0) {
            ls.pop().remove();
        }
    }
    function render(mark, removeNumber, direction) {
        const ls = fileInfo.page;
        for (let i = 0; i < removeNumber; ++i) {
            if (direction) {
                ls.shift().remove();
            }
            else {
                ls.pop().remove();
            }
        }

        let i = mark;
        while (i < fileInfo.length && i >= 0 && elements.text.offsetHeight < elements.content.offsetHeight) {
            const p = create('div');
            p.innerHTML = fileInfo.content[i] + '&nbsp;';
            if (direction) {
                elements.text.appendChild(p);
                ls.push(p);
                i++;
            }
            else {
                elements.text.insertBefore(p, elements.text.firstChild);
                ls.unshift(p);
                i--;
                if (i < 0) {
                    let t = ls.length;
                    while (t < fileInfo.length && elements.text.offsetHeight < elements.content.offsetHeight) {
                        const p = create('div');
                        p.innerHTML = fileInfo.content[t] + '&nbsp;';
                        elements.text.appendChild(p);
                        ls.push(p);
                        ++t
                    }
                }
            }
        }

        return direction ? mark : (i + 1);
    }

    function jump(index) {
        let i = index;

        const ls = fileInfo.page;
        render(i, ls.length, true);

        fileInfo.bookmark = index;
        fileInfo.page = ls;
        updateInfo();
    }
    function next() {
        const ls = fileInfo.page;
        if (fileInfo.bookmark + 1 >= fileInfo.length || ls.length === 0) {
            alert('已是最后一页');
            return;
        }

        let i = fileInfo.bookmark + fileInfo.page.length;

        const s = Math.max(ls.length - 1, 1);
        render(i, s, true);

        fileInfo.bookmark += s;
        fileInfo.page = ls;
        updateInfo();
    }
    function previous() {
        const ls = fileInfo.page;
        if (fileInfo.bookmark === 0 || ls.length === 0) {
            alert('已经是第一页');
            return
        }

        let i = fileInfo.bookmark;
        const mk = render(i, ls.length, false);

        fileInfo.bookmark = mk;
        fileInfo.page = ls;
        updateInfo();
    }

    // events
    elements.jump.addEventListener('click', function (e) {
        let value = prompt('跳转到？');
        value = parseInt(value);
        if (!isNaN(value) && fileInfo.content && fileInfo.length >= value) {
            jump(value);
        }
    });
    elements.fileholder.addEventListener('change', function (e) {
        const file = elements.fileholder.files[0];
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function () {
            loadFile(file.name, this.result);
        }
    });
    elements.load.addEventListener('click', function (e) {
        elements.fileholder.click();
    });
    elements.content.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });
    elements.content.addEventListener('mousedown', function (e) {
        if (e.button === 0) {
            next();
        }
        else if (e.button === 2) {
            previous();
        }
    });

    // move window
    let mouseMemory = [0, 0];
    let moveWindow = false
    elements.move.addEventListener('mousedown', function (e) {
        mouseMemory = [e.screenX - mouseMemory[0], e.screenY - mouseMemory[1]];
        moveWindow = !moveWindow;
    });
    document.documentElement.addEventListener('mousemove', function (e) {
        if (moveWindow) {
            elements.panel.style.left = `calc(50% + ${e.screenX - mouseMemory[0]}px)`;
            elements.panel.style.top = `calc(50% + ${e.screenY - mouseMemory[1]}px)`;
        }
    });

    // style sheet
    for (const ename in elements) {
        for (const cssname in css) {
            if (cssname == '*' || cssname === ename) {
                for (const attribute in css[cssname]) {
                    elements[ename].style[attribute] = css[cssname][attribute];
                }
            }
        }
    }

    // wake up & sleep
    document.onkeydown = function (event) {
        event = event || window.event
        if (event.shiftKey && (event.key === 'r' || event.key === 'R')) {
            elements.panel.style.display = css.panel.display;
        }
    }
    elements.panel.addEventListener('mouseleave', function (event) {
        if (!moveWindow) {
            elements.panel.style.display = 'none';
        }
    })
    elements.panel.style.display = 'none';

    // onload
    function onload() {
        const lfFileName = GM_getValue('lf_file_name');
        const lfFileContent = GM_getValue('lf_file_content');
        const lfBookmark = GM_getValue('lf_bookmark', 0);

        if (lfFileName && lfFileContent) {
            loadFile(lfFileName, lfFileContent);
        }
        if (fileInfo.content) {
            jump(lfBookmark);
        }
    }

    onload();
})();

