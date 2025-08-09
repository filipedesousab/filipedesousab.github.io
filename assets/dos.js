---
---
function parseRSS(xmlString) {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml')
  const items = xmlDoc.getElementsByTagName('entry')
  const result = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    const dateOptions = {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    }
    const date = new Date(item.getElementsByTagName('published')[0].textContent)
    const formattedDate = date.toLocaleDateString('pt-BR', dateOptions)

    result.push({
      title: item.getElementsByTagName('title')[0].textContent,
      link: item.getElementsByTagName('link')[0].attributes.href.value,
      published: formattedDate,
      summary: item.getElementsByTagName('summary')[0].textContent,
    })
  }

  return result
}

async function fetchRSS() {
  try {
    const response = await fetch('/feed.xml')
    if (!response.ok) {
      throw new Error(`Falha ao obter lista de posts.`)
    }
    return await response.text()
  } catch (error) {
    return error.message
  }
}

async function loadPosts() {
  const posts = await fetchRSS()
  return parseRSS(posts).reverse()
}

async function checkPostExists(index) {
  const posts = await loadPosts()
  return posts[index - 1] !== undefined
}

async function getPostTitles() {
  const posts = await loadPosts()

  return posts.reduceRight((acc, post, index) => {
    return `${acc}\n  ${index + 1}. ${post.published} - ${post.title}`
  }, '')
}

async function getPostSummary(index) {
  const posts = await loadPosts()
  return posts[index - 1].summary
}

async function getPostLink(index) {
  const posts = await loadPosts()
  return posts[index - 1].link
}

document.addEventListener('DOMContentLoaded', async () => {
  const terminal = document.getElementById('terminal')
  const output = document.getElementById('output')
  const inputLine = document.getElementById('input-line')

  let commandHistory = localStorage.getItem('commandHistory')
  commandHistory = commandHistory ? commandHistory.split(',') : []
  let historyIndex = commandHistory.length

  const commands = {
    help: `Comandos disponíveis:

  help                  - Mostrar esta lista de comandos.
  tui                   - Abrir interface TUI.
  about                 - Exibir informações sobre mim.
  contact               - Mostrar minhas informações de contato.
  post list             - Listar posts.
  post summary <indice> - Exibir resumo de um post específico.
  post open <indice>    - Abrir um post específico.
  cls                   - Limpar a tela do terminal.
  exit                  - Sair do terminal.`,

    about: `\nSou desenvolvedor de software por diversão e jardineiro de profissão. Ou talvez o inverso também.
Esse blog é uma tentativa de concentrar meus conhecimentos e, futuramente, refletir sobre minha trajetória.\n
Não sou inimigo de nenhuma tecnologia, mas sou um entusiasta de Ruby on Rails.
Portanto, é provável que haja mais conteúdos relacionados ao RoR e tecnologias relacionadas.`,

    contact: `Você pode me encontrar em:
{% if site.github_username %}
  GitHub:     github.com/{{ site.github_username | escape }}
{%- endif -%}
{% if site.linkedin_username %}
  LinkedIn:   linkedin.com/in/{{ site.linkedin_username | escape }}
{%- endif -%}`,

    exit: '\nOxi. Não posso fechar teu navegar. Tu mesmo que tem que fechar. Gudibái.',

    cls: ''
  }

  function showWelcomeMessage() {
    const dosHistory = sessionStorage.getItem('dosHistory')

    if (dosHistory) {
      output.innerHTML = dosHistory
      return
    }

    const welcomeText = `DOS like (v1.0)
(C) 2025 Filipe Botelho. Todos os direitos reservados.

Bem vindo! {{ site.description | escape }}

Digite 'help' para ver a lista de comandos disponíveis.
Digite 'tui' para acessar a interface TUI.\n\n`

    const p = document.createElement('p')
    p.textContent = welcomeText
    output.appendChild(p)
  }

  function showCommandLine(command = '') {
    const commandOutputLine = document.createElement('p')
    commandOutputLine.innerHTML = `<span class="prompt">C:\\></span>${command}`
    output.appendChild(commandOutputLine)
  }

  function showCommandReturn(command, text) {
    showCommandLine(command)
    const p = document.createElement('p')
    p.textContent = `${text}\n\n`
    output.appendChild(p)
  }

  function showCommandNotFound(command) {
    showCommandReturn(command, `Comando '${command}' não encontrado. Digite 'help' para ajuda.`)
  }

  async function executeCommand(command) {
    const firstCommand = command.split(' ')[0]
    const secondCommand = command.split(' ')[1]

    switch (firstCommand) {
      case 'cls':
        if (secondCommand) {
          showCommandNotFound(command)
          break
        }
        output.innerHTML = ''
        break
      case 'tui':
        if (secondCommand) {
          showCommandNotFound(command)
          break
        }
        showCommandLine(command)
        sessionStorage.setItem('dosHistory', output.innerHTML)
        window.location.href = '/tui'
        break
      case 'post':
        const thirdCommand = parseInt(command.split(' ')[2])
        const postExists = thirdCommand && await checkPostExists(thirdCommand)

        if (secondCommand === 'list' && !thirdCommand) {
          showCommandReturn(command, await getPostTitles())
          break
        } else if (secondCommand === 'summary') {
          if (postExists) {
            showCommandReturn(command, await getPostSummary(thirdCommand))
          } else {
            showCommandReturn(command, `Post não encontrado.`)
          }
          break
        } else if (secondCommand === 'open') {
          if (postExists) {
            showCommandLine(command)
            sessionStorage.setItem('dosHistory', output.innerHTML)
            window.location.href = await getPostLink(thirdCommand)
          } else {
            showCommandReturn(command, `Post não encontrado.`)
          }
          break
        }
      default:
        if (commands[command]) {
          showCommandReturn(command, `${commands[command]}`)
        } else {
          showCommandNotFound(command)
        }
        break
    }
  }

  inputLine.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      const command = inputLine.textContent.trim().toLowerCase()

      if (command) {
        commandHistory.push(command)
        localStorage.setItem('commandHistory', commandHistory)
        historyIndex = commandHistory.length
        await executeCommand(command)
        inputLine.textContent = ''
      } else {
        showCommandLine()
      }
      sessionStorage.setItem('dosHistory', output.innerHTML)
      terminal.scrollTop = terminal.scrollHeight
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (historyIndex > 0) {
        historyIndex--
        inputLine.textContent = commandHistory[historyIndex]
        placeCursorAtEnd()
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++
        inputLine.textContent = commandHistory[historyIndex]
        placeCursorAtEnd()
      } else if (historyIndex === commandHistory.length - 1) {
        historyIndex++
        inputLine.textContent = ''
      }
    }
  })

  terminal.addEventListener('click', () => {
    inputLine.focus()
  })

  function placeCursorAtEnd() {
    inputLine.focus()
    const range = document.createRange()
    range.selectNodeContents(inputLine)
    range.collapse(false)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  }

  showWelcomeMessage()
  inputLine.focus()
})
