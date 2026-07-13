---
layout: post
title: "Docker mais a fundo — Parte 1: Introdução e a Anatomia de uma Imagem no HD"
date: 2026-07-13 19:00:00 -0300
categories: [infraestrutura, docker]
tags: [containers, linux, containerd, overlayfs]
---

Se você trabalha com desenvolvimento de software, o Docker provavelmente já faz parte da sua rotina diária. A gente digita `docker build`, `docker run` e as coisas simplesmente funcionam. Mas você já parou para se perguntar o que acontece de verdade por baixo dos panos quando esses comandos são executados?

O objetivo desta série de posts não é mostrar como usar o Docker. A ideia aqui é abrir o capô da ferramenta e entender o seu funcionamento interno, abordando a engenharia e as ferramentas nativas do Linux que fazem os containers ganharem vida.

**Aviso importante:** Inevitavelmente, vou exibir comandos e caminhos reais de arquivos ao longo dos textos. Mas a intenção será sempre explicar *o que acontece com eles* no sistema operacional, e não o que eles fazem na superfície. Por isso, é importante que você já tenha um conhecimento prévio de como utilizar o Docker.

---

## O Docker não faz mágica

Para entender o presente, precisamos olhar um pouco para o passado. O Docker não inventou o conceito de container do zero. Quando nasceu, ele utilizava o **LXC (Linux Containers)** para unir ferramentas que já existiam nativamente no Kernel do Linux e criar ambientes isolados.

Com o tempo, o projeto evoluiu. O Docker substituiu o LXC por sua própria arquitetura interna (primeiro criando o `runc` e, mais tarde, adotando a combinação de `runc` + `containerd`), passando a gerenciar essas ferramentas diretamente no Kernel.

Quando falamos de "ferramentas nativas do Linux", estamos falando de tecnologias maduras:

* **OverlayFS (2015):** O sistema de arquivos atual (sucessor do antigo AUFS) usado para unificar as camadas somente leitura da imagem e a camada de escrita do container em uma única visão aparente.
* **Chroot (1982):** Usado originalmente para alterar o diretório aparente do root (`/`) para criar um novo ambiente logicamente separado.
* **Pivot_root (2000):** Uma evolução mais robusta e segura que o `chroot`. O Docker adota o `pivot_root` como padrão para alterar a raiz real do processo e permitir desmontar o sistema de arquivos antigo do hospedeiro, garantindo que o container fique trancado sem chances de escapar para o host.
* **Namespaces (2002):** A tecnologia que isola o que está dentro do container (processos, rede, usuários) do resto do sistema.
* **Cgroups (2006):** Usado para gerenciar e limitar os recursos da máquina (como capacidade de processamento e memória RAM) consumidos pelos containers.
* **Iptables (2000):** Responsável por controlar e redirecionar os pacotes de rede que chegam no host diretamente para os containers.

### Exemplo simples e prático com o chroot

Com esse exemplo podemos criar um container rudimentar para isolar a instalação do cmatrix separado dos arquivos do sistema operacional host.

```bash
sudo debootstrap --variant=minbase sid oxente # Baixar os arquivos mínimos do debian no diretorio oxente
sudo chroot oxente # Alterar o diretório root para o diretório oxente
apt-get install cmatrix # Instalar o cmatrix no diretório root aparente
cmatrix # Executar cmatrix
```

> *Nota técnica:*
>
> Para fins didáticos e práticos de visualização do isolamento do sistema de arquivos, ferramentas como o `debootstrap` nos permitem criar uma estrutura básica do Debian dentro de um diretório local para testarmos o comportamento do `chroot` na unha.
>
> Mas lembre-se: o Docker não usa mais o `chroot` por questões de segurança; ele vai direto de `pivot_root`. Além disso, é necessário no mínimo o uso de PID Namespace para isolar os processos do container e impedir que eles enxerguem os outros processos rodando no host.

---

## Detalhando uma Imagem: O que ela é no seu HD?

Para o desenvolvedor, uma imagem Docker é apenas um template somente leitura usado para criar containers. Na grande maioria das vezes, ela carrega os arquivos de um sistema operacional base (como Ubuntu ou Alpine), as bibliotecas e o código da aplicação, embora seja perfeitamente possível criar imagens minimalistas do zero (usando `FROM scratch`) contendo apenas um único binário compilado, sem nenhuma distro por baixo.

Mas se descermos até o disco físico do seu host Linux, **cada camada de uma imagem Docker é, na verdade, uma pasta física isolada contendo arquivos.**

![Camadas da imagem]({{"/assets/images/anatomia-imagem-docker/camadas-da-imagem.png" | relative_url}})

Para ver isso na prática, montei um laboratório simples utilizando uma imagem baseada no clássico `cmatrix`. O Dockerfile estruturado para o build foi este:

```dockerfile
FROM ubuntu:24.04
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install cmatrix -y
CMD ["cmatrix"]
```

Quando o processo de build termina, a estrutura resultante no disco físico do seu host se divide em camadas lógicas (Snapshots) que guardam apenas as modificações isoladas criadas por cada instrução do arquivo:

* **Layer 1 (Instrução `FROM ubuntu:24.04`):** É uma pasta física que contém a estrutura de diretórios raiz mínima da distribuição (`/bin`, `/etc`, `/usr`, `/var`, etc.).
* **Layer 2 (Instrução `RUN apt-get update`):** É uma pasta separada que contém **apenas** os arquivos gerados pela atualização das listas de pacotes do `apt`.
* **Layer 3 (Instrução `RUN ... apt-get install cmatrix -y`):** É outra pasta isolada contendo estritamente os binários e dependências instaladas do `cmatrix`.

### O perigo de dados críticos na imagem

Como cada linha gera uma pasta física definitiva no HD, se você tiver acesso root no host, você consegue abrir essas pastas individualmente e ler qualquer arquivo.

É por isso que **nunca se deve adicionar dados críticos (como chaves SSH, senhas ou tokens) no meio de um Dockerfile.** Mesmo que você adicione uma chave em um comando `RUN` e use um `RUN rm` na linha seguinte para apagá-la, o arquivo continuará salvo e visível para sempre dentro da pasta física correspondente à camada do `RUN` anterior.

---

## O que acontece no `docker run` e a união com OverlayFS?

![Camadas da imagem unidas pelo OverlayFS]({{"/assets/images/anatomia-imagem-docker/camadas-da-imagem-unidas-pelo-overlayfs.png" | relative_url}})

Se a imagem do nosso laboratório com o `cmatrix` está totalmente fragmentada nessas pastas físicas separadas no disco, o que acontece quando a gente finalmente inicia o container?

```bash
docker run -t cmatrix
```

Para o container rodar, o runtime de baixo nível (`runc`) faz uma chamada de sistema direto ao Kernel do Linux executando o equivalente a este comando de montagem do **OverlayFS**:

```bash
sudo mount -t overlay overlay \
  -o "lowerdir=/var/lib/containerd/.../2030/fs:/var/lib/containerd/.../2029/fs:/var/lib/containerd/.../2028/fs:/var/lib/containerd/.../2022/fs,\
upperdir=/var/lib/containerd/.../2031/fs,\
workdir=/var/lib/containerd/.../2031/work,\
nouserxattr" \
  /var/lib/docker/rootfs/overlayfs/42e32a7f2317c02be3bc22e50ef6914305e9e0b156e75e8f4b1effd7164af3ff
```

Se a gente destrinchar esse monte de texto, conseguimos enxergar exatamente a engenharia do sistema de arquivos dividida em três pilares:

### 1. O Bloco de Leitura (`lowerdir`)

O parâmetro `lowerdir` recebe a pilha de pastas que compõem a imagem. Repare que o Kernel lê esses caminhos da esquerda para a direita, em ordem inversa à criação:

* **`2030/fs`**: A camada final de fechamento da imagem gerada pelo `containerd` (onde moram arquivos técnicos de runtime como `/etc/hostname` e os ajustes do `.dockerenv`).
* **`2029/fs`**: A pasta isolada com os binários instalados do `cmatrix`.
* **`2028/fs`**: A pasta isolada com as listas de pacotes do `apt`.
* **`2022/fs`**: A pasta base contendo a estrutura mínima do Ubuntu.

O Kernel marca todas essas pastas do `lowerdir` estritamente como **somente leitura**. O container que vai nascer não pode alterar um único byte delas.

### 2. O Bloco de Escrita (`upperdir` e `workdir`)

Como um container precisa conseguir criar arquivos em tempo de execução (gravar logs, gerar arquivos temporários, etc.), o OverlayFS cria uma pasta vazia novinha no seu HD para ser a **`upperdir`** (no exemplo, a pasta `2031/fs`). Tudo o que for alterado ou criado enquanto o container estiver vivo será escrito fisicamente *apenas* ali dentro.

Ao lado dela, a **`workdir`** entra como um diretório técnico de manobra para o Kernel gerenciar os arquivos de forma segura antes de consolidar a escrita.

### 3. O Destino Virtual (`merged`)

O caminho final lá embaixo (a pasta longa começando com `/var/lib/docker/rootfs/...`) é o alvo da montagem. Esta é a famosa pasta **`merged`** (unificada).

Fisicamente, no seu HD, ela é apenas uma pasta vazia. Mas a mágica acontece aqui: quando o comando `mount` termina, o Kernel cria uma **ilusão de ótica** dentro dela. Se você der um `cd` nessa pasta de destino no seu host, você verá todas as camadas anteriores sobrepostas perfeitamente, como se fossem um único disco rígido estruturado com o sistema operacional e a sua aplicação prontos.

### Estou tentando ser mais didático aqui, mas não sei se estou conseguindo. Tentarei abstrair mais para ver se consigo

#### Estrutura do comando para montar as pastas com o OverlayFS

> mount -t overlay overlay -o
>
> lowerdir=**/pasta/do/metadados/do/containerd**:/pasta/do/segundo/run:**/pasta/do/primeiro/run**:/pasta/do/sistema-base(from),
>
> upperdir=**/caminho/da/pasta/de/escrita**,
>
> workdir=**/pasta/usada/pelo/kernel**,
>
> nouserxattr
>
> **/pasta/onde/o/overlay/juntará/tudo**

### Cada retângulo é uma pasta que está sendo montada após outra pasta, mesclando o conteúdo

Primeiro cria uma pasta vazia que junta todas as camadas de forma sobreposta

![Quadrado exemplificando uma pasta vazia]({{"/assets/images/anatomia-imagem-docker/retangulo-exemplificando-pasta-vazia.png" | relative_url}})

Monta virtualmente a pasta dos arquivos base da imagem

![Quadrado exemplificando pasta da camada 1]({{"/assets/images/anatomia-imagem-docker/retangulo-exemplificando-pasta-da-camada1.png" | relative_url}})

Monta virtualmente a pasta do primeiro RUN/COPY/ADD

![Quadrado exemplificando pasta da camada 2]({{"/assets/images/anatomia-imagem-docker/retangulo-exemplificando-pasta-da-camada2.png" | relative_url}})

Monta virtualmente a pasta do segundo RUN/COPY/ADD

![Quadrado exemplificando pasta da camada 3]({{"/assets/images/anatomia-imagem-docker/retangulo-exemplificando-pasta-da-camada3.png" | relative_url}})

Por fim, monta virtualmente a pasta de um volume ou bind mount

![Quadrado exemplificando pasta do volume]({{"/assets/images/anatomia-imagem-docker/retangulo-exemplificando-pasta-do-volume.png" | relative_url}})

### Visão da pasta montada pelo overlay

Usando o container do nosso exemplo `docker run -t cmatrix`, iniciado com base na imagem criada com o Dockerfile descrito acima, ao executar um `ls` na pasta montada pelo overlay, você verá todos os arquivos como se os arquivos estivessem de fato nessa pasta, mas eles estão alí apenas visualmente.

![Lista de arquivos da pasta de montagem (merged)]({{"/assets/images/anatomia-imagem-docker/lista-de-arquivos-da-pasta-merged.png" | relative_url}})

### Você pode fazer esse exemplo na prática e visualizar na sua máquina

Siga os passos:

1. É importante que remova todos os containers iniciados na máquina, para facilitar localizar os arquivos desse exemplo.
2. Crie o Dockerfile onde preferir
3. Faça o build da imagem com `docker build -t cmatrix .`
4. Inicie o container com `docker run -t cmatrix`

![Comandos do docker build e run]({{"/assets/images/anatomia-imagem-docker/comandos-do-docker-build-e-run.png" | relative_url}})

* Localize o ponto de montagem overlay com `mount | grep overlay`. Se houver outros containers em execução, irão aparecer muitos pontos de montagem, por isso é importante remover todos.
* Com permissão de super usuário `sudo`, navegue pela pasta onde todas as camadas estão montadas, sendo o primeiro caminho logo após o `overlay on` e antes do `type overlay`.
* Para navegar nas pastas das camadas, explore os caminhos logo após o `lowerdir=`. Eles estão separados por ":".

![Comandos mount, find e ls]({{"/assets/images/anatomia-imagem-docker/comandos-mount-find-ls.png" | relative_url}})

### O que acontece se alterar um arquivo com o container em execução

Se acessar o arquivo pela pasta do ponto de montagem (merged) e aplicar a alteração, o overlay irá aplicar o mecanismo de Copy-on-Write, no qual irá fazer uma cópia do arquivo na pasta de escrita `upperdir` e aplicará a alteração. Esse novo arquivo irá sobrescrever virtualmente o arquivo original.

Mas se acessar o arquivo pela pasta da camada, o overlay não conseguirá identificar a alteração que acontecerá no arquivo original, podendo dessincronizar os índices de inodes do OverlayFS e causar travamento no container.

---

## O Manifesto da Imagem e o Banco de Dados Local

Quando essa imagem é enviada para um servidor remoto (um Registry como o Docker Hub), essas pastas são compactadas em arquivos `.tar.gz`. Junto com elas, viaja um arquivo JSON chamado **Manifesto da Imagem**, que contém os metadados e os hashes estruturados de cada camada.

Se você rodar o comando inspect na sua máquina local após fazer o build:

```bash
docker inspect cmatrix
```

Você encontrará um bloco descrevendo o sistema de arquivos da imagem, parecido com este:

```json
…
"RootFS": {
    "Type": "layers",
    "Layers": [
        "sha256:f103cd120fdd6cbc7f3d0e1d5bfb3e16290c32ead7b822d15c34460ecdf64b29",
        "sha256:ae9b54f344b2f0c710988d878d198e0bc97bd28a8703a8f5bb69af43a6f1cd41",
        "sha256:2c5b3984de25cc89130190fa8630ad5dcfbc697b1924e5bea56f8d6d050543aa"
    ]
}
…
```

Esses hashes longos (`sha256:...`) não indicam caminhos de pastas diretamente, porque os caminhos mudam de computador para computador. Em vez disso, eles funcionam como chaves lógicas (IDs das camadas).

O `containerd` mantém um banco de dados interno local (um banco chave-valor binário localizado em `/var/lib/containerd/io.containerd.metadata.v1.bolt/meta.db`). É esse banco de dados que faz o mapeamento do sistema, registrando que o hash lógico `"sha256:f103cd12..."` corresponde, por exemplo, à pasta física real `/var/lib/containerd/.../snapshots/2022/fs` no seu disco rígido. É dessa forma que ele localiza as pastas exatas a serem montadas.

---

## Para o próximo post

Nesse post resolvemos a estrutura de arquivos, mas se executarmos o cmatrix na pasta unificada diretamente ou por meio do chroot, ele vai rodar solto no host, conseguindo enxergar os outros processos da máquina.

No próximo post quero abordar o uso do `pivot_root` e possivelmente como os Namespaces entram para isolar os processos.
