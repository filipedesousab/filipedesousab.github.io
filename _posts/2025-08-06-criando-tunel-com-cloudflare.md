---
layout: post
title:  "Criando túnel com Cloudflare"
date:   2025-08-06 07:00:00 GMT-0300
categories: jekyll update
---

Eu estava procurando por um meio de criar um túnel para acessar e testar minha aplicação por um domínio. Eu normalmente uso o Ngrok para criar um túnel, principalmente por usar uma imagem Docker dele que resolve isso facilmente. Mas nesse momento eu precisava criar um túnel que pudesse usar meu domínio pessoal. Com o Ngrok isso é possível, porém requer pagar pelo serviço, mas eu queria apenas um túnel temporário.

Como meu domínio está no Cloudflare, eu procurei um serviço deles para isso e eu realmente o encontrei. A Clowdflare tem uma solução para criar um túnel.


## O que é o Cloudflare Tunnel?

<img src="https://cf-assets.www.cloudflare.com/zkvhlag99gkb/4JiK6i2ZWO5iktBimbbSw3/9308d07667006ac4d8aa6d0b0b53d401/image1.png" alt="Cloudflare Tunnel" width="100%">

O Cloudflare Tunnel é um serviço que cria uma conexão entre sua infraestrutura local e a infraestrutura da Cloudflare. Ele utiliza o agente `cloudflared`, que é instalado no seu servidor e é responsável por criar essa conexão. Na infraestrutura da Cloudflare é possível configurar um registro DNS para direcionar o tráfego externo para esse túnel.

### Como funciona?

O processo de funcionamento pode ser resumido em três etapas principais:

1. O usuário inicia o tráfego com uma requisição ao domínio específico
2. A Cloudflare recebe a requisição e a encaminha através do túnel
3. O agente `cloudflared` recebe a requisição e a encaminha para a aplicação que está configurada

Para saber mais acesse [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)

### Pré-requisitos
- Uma conta na Cloudflare.
- Um domínio gerenciado pela Cloudflare, não necessariamente criado por lá.
- Acesso de administrador ao servidor onde sua aplicação está rodando.

## Passo 1 - configurar domínio para ser gerenciado pela Cloudflare

Você precisa ter uma conta na Cloudflare e o DNS do seu domínio deve estar sendo gerenciado por lá. Não é necessário você comprar o domínio lá. Por exemplo, se você comprar um domínio no registro.br, você apenas deve configurar a Cloudflare para gerenciar esse domínio e configurar os NS no registro.br.

Para entender melhor, existe esse conteúdo mostrando como fazer: [Como Usar o Cloudflare para Gerenciar Domínios: Guia Completo](https://dantetesta.com.br/gerenciamento-de-dominios-com-cloudflare/)

Você não precisa criar um registro tipo A para a hospedagem, como explicado no vídeo acima, até porque talvez não você tenha contratado um serviço de hospedagem. A partir desse ponto, pode ser ignorado.

## Passo 2 - instalar o cloudflared no servidor linux

O `cloudflared` é um agente open source que pode ser instalado via um arquivo deb para Debian/Ubuntu, ou baixar um binário compilado para ser executado em outras distribuições. Inclusive tem binário até para Windows.

Outras opções para download pode ser encontrado em: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

### Instaladndo no Debian/Ubuntu

1. Baixe o deb
    - `wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb`
2. Instale o deb
    - `sudo dpkg -i cloudflared-linux-amd64.deb`
3. Verifique se está instalado corretamente
    - `cloudflared --version`

## Passo 2 - autenticar com sua conta Cloudflare
Execute o comando `cloudflared tunnel login`

Este comando abrirá uma URL no seu navegador. Você precisará fazer login na sua conta Cloudflare e selecionar o domínio que você deseja usar com o túnel. O domínio já deve estar adicionado como descrito no Passo 1. Após a autorização, o cloudflared salvará um certificado de credenciais no seu diretório ~/.cloudflared/cert.pem.

## Passo 3 - criar um túnel

Execute o comando `cloudflared tunnel create <NOME_DO_TUNEL>`
  - Substitua <NOME_DO_TUNEL> por um nome descritivo para o seu túnel (por ex. web-dashboard-production).
  - Este comando criará um túnel e fornecerá um ID de túnel (um hash) e um arquivo de credenciais do túnel (geralmente em ~/.cloudflared/\<TUNNEL_ID\>.json).

## Passo 4 - criar o arquivo de configuração do túnel

Este arquivo diz ao cloudflared para onde ele deve rotear o tráfego que chega através do túnel. Ele geralmente é criado no mesmo diretório dos seus outros arquivos cloudflared (por ex. ~/.cloudflared/config.yml).

Crie o arquivo `~/.cloudflared/config.yml` e adicione:
```yaml
tunnel: <TUNNEL_ID> # Substitua pelo ID do túnel que você criou no passo anterior
ingress:
  - hostname: seudominio.com.br
    service: http://localhost:3000 # Substitua pela porta do seu serviço local
  - hostname: www.seudominio.com.br
    service: http://localhost:3000 # Se você quiser o www também
  - service: http_status:404 # Uma regra padrão para qualquer outra coisa que não corresponda
```

## Passo 5 - configurar o registro DNS na Cloudflare

Agora você precisa dizer ao Cloudflare para direcionar o tráfego do seu domínio para o seu túnel. Lembre de substituir o `<NOME_DO_TUNEL>` pelo nome usado no Passo 3 e o `seudominio.com.br` pelo nome do seu domínio.
  - `cloudflared tunnel route dns <NOME_DO_TUNEL> seudominio.com.br`
  - `cloudflared tunnel route dns <NOME_DO_TUNEL> www.seudominio.com.br`

Isso criará um registro CNAME para seudominio.com.br (e www) na sua zona DNS da Cloudflare, apontando para o seu túnel. Você verá esses registros no painel DNS da Cloudflare.

## Passo 6 - iniciar o túnel

Você pode rodar o túnel temporariamente ou como um serviço systemd para que ele inicie automaticamente com o sistema.

### Temporariamente (para testar):

- `cloudflared tunnel run <NOME_DO_TUNEL>`
- O túnel estará ativo enquanto esta janela do terminal estiver aberta

### Como um serviço systemd para iniciar automaticamente

1. `sudo cloudflared service install`
2. `sudo systemctl enable cloudflared`
3. `sudo systemctl start cloudflared`
4. Verifique se foi iniciado corretamente com `sudo systemctl status cloudflared`

## Conclusão

Após esses passos deve acessar a aplicação através do domínio configurado. Se algo der errado, a documentação do serviço de túnel tem várias explicações para poder estudar o que está falhando. Inclusive há vários parâmetros que podem ser configurados. A documentação completa está em [https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/).

Se encontrar alguma falha no passo a passo, pode entrar em contato comigo e avisar.
