---
---
document.addEventListener('DOMContentLoaded', () => {
  const terminal = document.getElementById('terminal');
  const output = document.getElementById('output');
  const inputLine = document.getElementById('input-line');

  let commandHistory = sessionStorage.getItem('commandHistory');
  commandHistory = commandHistory ? commandHistory.split(',') : [];
  let historyIndex = commandHistory.length;

  const commands = {
    help: `Comandos disponíveis:

  help      - Mostrar esta lista de comandos.
  gui       - Abrir interface gráfica.
  about     - Exibir informações sobre mim.
  posts     - Listar posts.
  contact   - Mostrar minhas informações de contato.
  clear     - Limpar a tela do terminal.`,

    about: `\nSou desenvolvedor de software por diversão e jardineiro de profissão. Ou talvez o inverso também.
Esse blog é uma tentativa de concentrar meus conhecimentos e, futuramente, refletir sobre minha trajetória.\n
Não sou inimigo de nenhuma tecnologia, mas sou um entusiasta de Ruby on Rails.
Portanto, é provável que haja mais conteúdos relacionados ao RoR e tecnologias relacionadas.`,

    posts: `{% for post in site.posts %}
  {%- assign date_format = site.minima.date_format | default: "%b %-d, %Y" -%}
  \n {{ forloop.index }}. {{ post.date | date: date_format }} - {{ post.title | escape }}
{%- endfor -%}`,

    contact: `Você pode me encontrar em:
{% if site.github_username %}
  GitHub:     github.com/{{ site.github_username | escape }}
{%- endif -%}
{% if site.linkedin_username %}
  LinkedIn:   linkedin.com/in/{{ site.linkedin_username | escape }}
{%- endif -%}`,

    clear: ''
  };

  function showWelcomeMessage() {
    const dosHistory = sessionStorage.getItem('dosHistory');

    if (dosHistory) {
      output.innerHTML = dosHistory;
      return;
    }

    const welcomeText = `DOS like (v1.0)
(c) 2025 Filipe Botelho. Todos os direitos reservados.

Bem vindo! {{ site.description | escape }}

Digite 'help' para ver a lista de comandos disponíveis.
Digite 'gui' para acessar a interface gráfica.\n\n`;

    const p = document.createElement('p');
    p.textContent = welcomeText;
    output.appendChild(p);
  }

  function executeCommand(command) {
    const commandOutputLine = document.createElement('p');
    commandOutputLine.innerHTML = `<span class="prompt">C:\\></span>${command}`;
    output.appendChild(commandOutputLine);

    if (command === 'clear') {
      output.innerHTML = '';
    } else if (command === 'gui') {
      window.location.href = '/gui';
      sessionStorage.setItem('dosHistory', output.innerHTML)
    } else if (commands[command]) {
      const response = document.createElement('p');
      response.textContent = `${commands[command]}\n\n`;
      output.appendChild(response);
    } else {
      const error = document.createElement('p');
      error.textContent = `Comando '${command}' não reconhecido. Digite 'help' para ajuda.\n\n`;
      output.appendChild(error);
    }
  }

  inputLine.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const command = inputLine.textContent.trim().toLowerCase();

      if (command) {
        commandHistory.push(command);
        sessionStorage.setItem('commandHistory', commandHistory)
        historyIndex = commandHistory.length;
        executeCommand(command);
        inputLine.textContent = '';
      } else {
        const emptyLine = document.createElement('p');
        emptyLine.innerHTML = `<span class="prompt">C:\\></span>`;
        output.appendChild(emptyLine);
      }
      terminal.scrollTop = terminal.scrollHeight;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        inputLine.textContent = commandHistory[historyIndex];
        placeCursorAtEnd();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        inputLine.textContent = commandHistory[historyIndex];
        placeCursorAtEnd();
      } else if (historyIndex === commandHistory.length - 1) {
        historyIndex++;
        inputLine.textContent = '';
      }
    }
  });

  terminal.addEventListener('click', () => {
    inputLine.focus();
  });

  function placeCursorAtEnd() {
    inputLine.focus();
    const range = document.createRange();
    range.selectNodeContents(inputLine);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  showWelcomeMessage();
  inputLine.focus();
});
