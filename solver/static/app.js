// 호두 문제풀이 - 프런트엔드
(() => {
  "use strict";

  const STORAGE_KEY = "hodu.pages.v1";
  const MAX_IMAGE_EDGE = 1568;

  const CATEGORIES = {
    auto:     { label: "자동 판별", icon: "🧠", color: "gray" },
    linux:    { label: "리눅스",    icon: "🐧", color: "blue" },
    circuit:  { label: "회로 이론", icon: "⚡", color: "yellow" },
    mcu:      { label: "MCU",       icon: "🔌", color: "green" },
    embedded: { label: "임베디드",  icon: "🛠️", color: "purple" },
  };

  const EXAMPLES = [
    { cat: "linux", text: "현재 디렉터리 아래에서 7일 이상 수정되지 않은 .log 파일을 찾아 압축한 뒤 원본을 삭제하는 명령어를 작성하세요." },
    { cat: "circuit", text: "12V 전원에 R1=4kΩ, R2=6kΩ이 직렬로 연결되어 있고 R2에 병렬로 R3=3kΩ이 연결되어 있습니다. R3에 흐르는 전류를 구하세요." },
    { cat: "mcu", text: "STM32F4에서 시스템 클럭이 84MHz일 때 TIM2로 1kHz, 듀티 25% PWM을 만들려면 PSC와 ARR, CCR 값을 어떻게 설정해야 하나요?" },
    { cat: "embedded", text: "ISR과 메인 루프가 공유하는 변수에 volatile이 필요한 이유와, volatile만으로 부족한 경우를 예시 코드와 함께 설명하세요." },
  ];

  // ---------- 상태 ----------
  let pages = loadPages();
  let currentId = null;
  let filterCat = null;
  let pendingImages = []; // {media_type, data}
  let controller = null;

  const $ = (id) => document.getElementById(id);
  const el = {
    app: document.querySelector(".app"),
    pageList: $("pageList"), categoryList: $("categoryList"), search: $("searchInput"),
    newPage: $("newPageBtn"), collapse: $("collapseBtn"), openSidebar: $("openSidebarBtn"),
    breadcrumb: $("breadcrumb"), status: $("topbarStatus"), scroller: $("scroller"),
    icon: $("pageIcon"), title: $("pageTitle"), catSelect: $("categorySelect"), createdAt: $("createdAt"),
    empty: $("empty"), examples: $("examples"), turns: $("turns"),
    composer: $("composer"), input: $("questionInput"), attachments: $("attachments"),
    fileInput: $("fileInput"), send: $("sendBtn"), stop: $("stopBtn"),
  };

  // ---------- 저장소 ----------
  function loadPages() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }
  function savePages() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pages)); }
    catch {
      el.status.textContent = "저장 공간이 부족합니다. 오래된 페이지를 삭제해 주세요.";
    }
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const current = () => pages.find((p) => p.id === currentId);

  function newPage() {
    const page = {
      id: uid(), title: "", category: filterCat || "auto",
      createdAt: Date.now(), updatedAt: Date.now(), turns: [],
    };
    pages.unshift(page);
    savePages();
    openPage(page.id);
    el.input.focus();
  }

  function deletePage(id) {
    const page = pages.find((p) => p.id === id);
    if (!page || !confirm(`'${page.title || "제목 없음"}' 페이지를 삭제할까요?`)) return;
    pages = pages.filter((p) => p.id !== id);
    savePages();
    if (currentId === id) {
      if (pages.length) openPage(pages[0].id); else newPage();
    } else renderSidebar();
  }

  // ---------- 마크다운 + 수식 ----------
  marked.setOptions({ gfm: true, breaks: false });

  function renderMarkdown(src) {
    const codes = [];
    const maths = [];
    // 1) 코드 보호
    let s = src.replace(/```[\s\S]*?(?:```|$)|`[^`\n]+`/g, (m) => `CODEPH${codes.push(m) - 1}X`);
    // 2) 수식 추출
    const keepMath = (tex, display) => `MATHPH${maths.push({ tex, display }) - 1}X`;
    s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => keepMath(t, true))
         .replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => keepMath(t, true))
         .replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => keepMath(t, false))
         .replace(/\$(?!\s)([^$\n]+?)(?<!\s)\$/g, (_, t) => keepMath(t, false));
    // 3) 코드 복원 후 파싱
    s = s.replace(/CODEPH(\d+)X/g, (_, i) => codes[+i]);
    let html = DOMPurify.sanitize(marked.parse(s));
    // 4) 수식 렌더링
    html = html.replace(/MATHPH(\d+)X/g, (_, i) => {
      const { tex, display } = maths[+i];
      try {
        return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: "html" });
      } catch {
        return escapeHtml(tex);
      }
    });
    return html;
  }

  function decorateCode(root) {
    root.querySelectorAll("pre > code").forEach((code) => {
      const pre = code.parentElement;
      if (pre.dataset.done) return;
      pre.dataset.done = "1";
      const lang = (code.className.match(/language-(\S+)/) || [])[1];
      try { hljs.highlightElement(code); } catch { /* 알 수 없는 언어 */ }
      const label = document.createElement("span");
      label.className = "code-lang";
      label.textContent = lang || "code";
      const copy = document.createElement("button");
      copy.className = "copy-btn";
      copy.textContent = "복사";
      copy.onclick = async () => {
        await navigator.clipboard.writeText(code.innerText);
        copy.textContent = "복사됨";
        setTimeout(() => (copy.textContent = "복사"), 1200);
      };
      pre.append(label, copy);
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- 렌더링 ----------
  function renderSidebar() {
    const q = el.search.value.trim().toLowerCase();

    el.categoryList.innerHTML = "";
    Object.entries(CATEGORIES).forEach(([key, c]) => {
      const count = pages.filter((p) => p.category === key).length;
      const btn = document.createElement("button");
      btn.className = "side-item" + (filterCat === key ? " active" : "");
      btn.innerHTML = `<span class="side-icon">${c.icon}</span>${c.label}<span class="side-count">${count || ""}</span>`;
      btn.onclick = () => { filterCat = filterCat === key ? null : key; renderSidebar(); };
      el.categoryList.append(btn);
    });

    const list = pages.filter((p) => {
      if (filterCat && p.category !== filterCat) return false;
      if (!q) return true;
      const hay = (p.title + " " + p.turns.map((t) => t.text || "").join(" ")).toLowerCase();
      return hay.includes(q);
    });

    el.pageList.innerHTML = "";
    if (!list.length) {
      el.pageList.innerHTML = `<div class="none">${q ? "검색 결과가 없습니다" : "페이지가 없습니다"}</div>`;
    }
    list.forEach((p) => {
      const item = document.createElement("div");
      item.className = "side-item" + (p.id === currentId ? " active" : "");
      item.innerHTML = `<span class="side-icon">${CATEGORIES[p.category]?.icon || "📄"}</span>`;
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = p.title || "제목 없음";
      const del = document.createElement("button");
      del.className = "del";
      del.title = "삭제";
      del.textContent = "🗑";
      del.onclick = (e) => { e.stopPropagation(); deletePage(p.id); };
      item.append(label, del);
      item.onclick = () => openPage(p.id);
      el.pageList.append(item);
    });
  }

  function renderHeader() {
    const page = current();
    const cat = CATEGORIES[page.category] || CATEGORIES.auto;
    el.icon.textContent = cat.icon;
    if (document.activeElement !== el.title) el.title.textContent = page.title;
    el.breadcrumb.innerHTML = `호두의 문제풀이<span class="sep">/</span>${escapeHtml(page.title || "제목 없음")}`;
    document.title = `${page.title || "제목 없음"} · 호두 문제풀이`;
    el.createdAt.textContent = new Date(page.createdAt).toLocaleString("ko-KR", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

    el.catSelect.innerHTML = "";
    Object.entries(CATEGORIES).forEach(([key, c]) => {
      const tag = document.createElement("button");
      tag.className = `tag tag-${c.color}` + (page.category === key ? " on" : "");
      tag.textContent = c.label;
      tag.onclick = () => {
        page.category = key;
        page.updatedAt = Date.now();
        savePages();
        renderHeader();
        renderSidebar();
      };
      el.catSelect.append(tag);
    });
  }

  function renderTurns() {
    const page = current();
    el.turns.innerHTML = "";
    el.empty.hidden = page.turns.length > 0;
    page.turns.forEach((turn, i) => {
      if (turn.role === "user") {
        el.turns.append(questionBlock(turn, i));
      } else {
        const view = answerBlock();
        view.setThinking(turn.thinking || "");
        view.setText(turn.text || "");
        if (turn.usage) view.setMeta(turn.usage);
        el.turns.append(view.root);
      }
    });
  }

  function questionBlock(turn, index) {
    const wrap = document.createElement("div");
    wrap.className = "turn";
    const q = document.createElement("div");
    q.className = "question";
    q.innerHTML = `<div class="q-icon">❓</div>`;
    const body = document.createElement("div");
    body.className = "q-body";
    body.textContent = turn.text;
    const images = turnImages(turn);
    if (images.length) {
      const imgs = document.createElement("div");
      imgs.className = "q-images";
      images.forEach((img) => {
        const im = document.createElement("img");
        im.src = `data:${img.media_type};base64,${img.data}`;
        imgs.append(im);
      });
      body.append(imgs);
    }
    q.append(body);
    wrap.append(q);

    if (turn.failed) {
      const err = document.createElement("div");
      err.className = "error-callout";
      err.innerHTML = `<span>⚠️</span><span class="err-msg"></span>`;
      err.querySelector(".err-msg").textContent = turn.error || "풀이를 완료하지 못했습니다.";
      const retry = document.createElement("button");
      retry.className = "ghost-btn";
      retry.textContent = "↻ 다시 시도";
      retry.onclick = () => retryTurn(index);
      err.append(retry);
      wrap.append(err);
    }
    return wrap;
  }

  // 이미지는 API용 블록에만 저장해 중복 저장을 피한다
  function turnImages(turn) {
    return (turn.api || []).filter((b) => b.type === "image").map((b) => b.source);
  }

  function answerBlock() {
    const root = document.createElement("div");
    root.className = "turn answer";
    const status = document.createElement("div");
    status.className = "status-line";
    status.hidden = true;
    const toggle = document.createElement("div");
    toggle.className = "toggle";
    toggle.hidden = true;
    toggle.innerHTML = `<button class="toggle-head"><span class="toggle-arrow">▶</span>💭 생각 과정</button><div class="toggle-body"></div>`;
    toggle.querySelector(".toggle-head").onclick = () => toggle.classList.toggle("open");
    const md = document.createElement("div");
    md.className = "md";
    const meta = document.createElement("div");
    meta.className = "meta";
    root.append(status, toggle, md, meta);

    let raf = 0;
    let latest = "";
    return {
      root,
      setStatus(text) {
        status.hidden = !text;
        status.innerHTML = text ? `<span>🌰</span><span class="dots">${text}</span>` : "";
      },
      setThinking(text) {
        toggle.hidden = !text;
        toggle.querySelector(".toggle-body").textContent = text;
      },
      setText(text) {
        latest = text;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          md.innerHTML = renderMarkdown(latest);
          decorateCode(md);
        });
      },
      setMeta(u) {
        meta.textContent = `입력 ${u.input_tokens.toLocaleString()} · 출력 ${u.output_tokens.toLocaleString()} 토큰`;
      },
    };
  }

  function openPage(id) {
    if (controller) return; // 풀이 중에는 이동하지 않음
    currentId = id;
    clearAttachments();
    el.input.value = "";
    autosize();
    renderHeader();
    renderTurns();
    renderSidebar();
    el.scroller.scrollTop = 0;
    if (isMobile()) el.app.classList.add("sidebar-hidden");
  }

  const isMobile = () => window.matchMedia("(max-width: 700px)").matches;

  function renderExamples() {
    EXAMPLES.forEach((ex) => {
      const b = document.createElement("button");
      b.className = "example";
      b.innerHTML = `<span class="ex-cat">${CATEGORIES[ex.cat].icon} ${CATEGORIES[ex.cat].label}</span><span></span>`;
      b.lastChild.textContent = ex.text;
      b.onclick = () => {
        const page = current();
        page.category = ex.cat;
        renderHeader();
        el.input.value = ex.text;
        autosize();
        el.input.focus();
      };
      el.examples.append(b);
    });
  }

  // ---------- 이미지 첨부 ----------
  function addFiles(files) {
    [...files].filter((f) => f.type.startsWith("image/")).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width: w, height: h } = img;
          let dataUrl = reader.result;
          if (Math.max(w, h) > MAX_IMAGE_EDGE || !/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
            const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(w, h));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(w * scale);
            canvas.height = Math.round(h * scale);
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          }
          const [head, data] = dataUrl.split(",");
          pendingImages.push({ media_type: head.match(/data:(.*);base64/)[1], data });
          renderAttachments();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function renderAttachments() {
    el.attachments.innerHTML = "";
    pendingImages.forEach((img, i) => {
      const t = document.createElement("div");
      t.className = "thumb";
      t.innerHTML = `<img src="data:${img.media_type};base64,${img.data}"><button title="제거">×</button>`;
      t.querySelector("button").onclick = () => { pendingImages.splice(i, 1); renderAttachments(); };
      el.attachments.append(t);
    });
  }
  function clearAttachments() { pendingImages = []; renderAttachments(); }

  // ---------- 풀이 요청 ----------
  function buildApiMessages(page) {
    // 실패/중단된 질문과 그 응답은 빼고, 완료된 대화만 원본 그대로 보낸다
    const msgs = [];
    page.turns.forEach((t) => {
      if (t.role === "user" && !t.failed) msgs.push({ role: "user", content: t.api });
      if (t.role === "assistant" && t.content) msgs.push({ role: "assistant", content: t.content });
    });
    return msgs;
  }

  async function send(text, images) {
    const page = current();
    text = text.trim();
    if ((!text && !images.length) || controller) return;

    const cat = page.category;
    const prefix = cat !== "auto" ? `[분야: ${CATEGORIES[cat].label}]\n\n` : "";
    const api = [
      ...images.map((img) => ({ type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } })),
      { type: "text", text: prefix + (text || "첨부한 이미지의 문제를 풀어 주세요.") },
    ];
    const userTurn = { role: "user", text, api, category: cat };
    page.turns.push(userTurn);
    if (!page.title) page.title = (text || "이미지 문제").split("\n")[0].slice(0, 40);
    page.updatedAt = Date.now();
    pages = [page, ...pages.filter((p) => p.id !== page.id)];
    savePages();

    el.input.value = "";
    autosize();
    clearAttachments();
    renderHeader();
    renderTurns();
    renderSidebar();

    const view = answerBlock();
    el.turns.append(view.root);
    view.setStatus("문제를 읽는 중");
    view.root.scrollIntoView({ behavior: "smooth", block: "start" });

    setBusy(true);
    controller = new AbortController();
    let thinking = "";
    let answer = "";
    let finished = null;
    let errorMsg = null;

    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat, messages: buildApiMessages(page) }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`서버 오류 (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const ev = (chunk.match(/^event: (.*)$/m) || [])[1];
          const dataLine = (chunk.match(/^data: (.*)$/m) || [])[1];
          if (!ev || dataLine === undefined) continue;
          const data = JSON.parse(dataLine);
          if (ev === "status") {
            view.setStatus({ thinking: "생각하는 중", writing: "풀이 작성 중", fallback: "다른 모델로 이어서 푸는 중" }[data] || "");
          } else if (ev === "thinking") {
            thinking += data;
            view.setThinking(thinking);
          } else if (ev === "text") {
            answer += data;
            view.setText(answer);
          } else if (ev === "done") {
            finished = data;
          } else if (ev === "error") {
            errorMsg = data;
          }
        }
      }
    } catch (e) {
      errorMsg = e.name === "AbortError" ? "풀이를 중지했습니다." : `연결 오류: ${e.message}`;
    }

    view.setStatus("");
    controller = null;
    setBusy(false);

    if (finished && !errorMsg) {
      // 최종 응답 기준으로 다시 그림 (폴백이 일어난 경우 등)
      const finalText = finished.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      const finalThinking = finished.content.filter((b) => b.type === "thinking").map((b) => b.thinking).join("\n\n");
      page.turns.push({
        role: "assistant",
        content: finished.content,
        text: finalText + (finished.stop_reason === "max_tokens" ? "\n\n> ⚠️ 답변이 길어 중간에 잘렸습니다." : ""),
        thinking: finalThinking || thinking,
        usage: finished.usage,
      });
    } else {
      userTurn.failed = true;
      userTurn.error = errorMsg || "응답이 중간에 끊겼습니다.";
    }
    page.updatedAt = Date.now();
    savePages();
    renderTurns();
  }

  function retryTurn(index) {
    const page = current();
    const turn = page.turns[index];
    if (!turn || controller) return;
    page.turns.splice(index, 1);
    page.category = turn.category || page.category;
    savePages();
    send(turn.text, turnImages(turn));
  }

  function setBusy(busy) {
    el.send.hidden = busy;
    el.stop.hidden = !busy;
    el.status.textContent = busy ? "호두가 풀이 중입니다…" : "";
  }

  function autosize() {
    el.input.style.height = "auto";
    el.input.style.height = el.input.scrollHeight + "px";
  }

  // ---------- 이벤트 ----------
  el.send.onclick = () => send(el.input.value, pendingImages.slice());
  el.stop.onclick = () => controller?.abort();
  el.input.addEventListener("input", autosize);
  el.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      el.send.click();
    }
  });
  el.input.addEventListener("paste", (e) => {
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) { e.preventDefault(); addFiles(files); }
  });
  el.fileInput.onchange = () => { addFiles(el.fileInput.files); el.fileInput.value = ""; };
  el.composer.addEventListener("dragover", (e) => { e.preventDefault(); el.composer.classList.add("drag"); });
  el.composer.addEventListener("dragleave", () => el.composer.classList.remove("drag"));
  el.composer.addEventListener("drop", (e) => {
    e.preventDefault();
    el.composer.classList.remove("drag");
    addFiles(e.dataTransfer.files);
  });

  el.title.addEventListener("input", () => {
    const page = current();
    page.title = el.title.textContent.trim();
    page.updatedAt = Date.now();
    savePages();
    el.breadcrumb.innerHTML = `호두의 문제풀이<span class="sep">/</span>${escapeHtml(page.title || "제목 없음")}`;
    renderSidebar();
  });
  el.title.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); el.input.focus(); }
  });

  el.search.addEventListener("input", renderSidebar);
  el.newPage.onclick = newPage;
  el.collapse.onclick = () => el.app.classList.add("sidebar-hidden");
  el.openSidebar.onclick = () => el.app.classList.remove("sidebar-hidden");
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      el.app.classList.remove("sidebar-hidden");
      el.search.focus();
      el.search.select();
    }
  });

  // ---------- 시작 ----------
  renderExamples();
  if (pages.length) openPage(pages[0].id); else newPage();
})();
