document.addEventListener('DOMContentLoaded', function () {

    let savedLink = undefined

    const modal = document.getElementById('welcome')

    if (modal && !sessionStorage.getItem('modalShow')) {
        const closeButton = modal.querySelector('.close-button')

        function openModal() {
            modal.style.display = 'flex'
            sessionStorage.setItem('modalShow', true)
        }
        openModal()

        function closeModal() {
            setTimeout(() => {
                modal.style.display = 'none'
            }, 200);
        }
        closeButton.addEventListener('click', closeModal)
    }

    document.addEventListener('keydown', function (event) {
        if (sessionStorage.getItem('modalShow')) {
            setTimeout(() => {
                modal.querySelector('.close-button').focus()
            }, 100);
        }
        let currentLink = document.querySelector('a:focus')
        let linkList = undefined;

        if (event.altKey) {
            switch (event.key) {
                case 'h':
                case 'H':
                    document.querySelector('.page-link.h').focus()
                    break
                case 'p':
                case 'P':
                    document.querySelector('.page-link.p').focus()
                    break
                default:
                    document.querySelector('.page-link.h').focus()
            }
        } else {
            switch (event.key) {
                case 'Escape':
                    const menuLink = document.querySelector('a.page-link:focus')
                    if (menuLink) menuLink.blur()
                    const linkToFocus = savedLink || document.querySelector('.internal-wrapper a')
                    linkToFocus.focus()
                    break
                case 'Enter':
                    currentLink = document.querySelector('.internal-wrapper a:focus, .modal a:focus')
                    currentLink.classList.add('active')
                    setTimeout(() => {
                        currentLink.classList.remove('active')
                    }, 100);
                    break
                case 'ArrowDown':
                    if (!currentLink) {
                        savedLink = document.querySelector('.internal-wrapper a')
                        savedLink.focus()
                        break
                    }
                    currentLink = document.querySelector('.internal-wrapper a:focus')
                    linkList = Array.from(document.querySelectorAll('.internal-wrapper a:not([hidden])'))
                    savedLink = selectLink(currentLink, linkList) || savedLink
                    break
                case 'ArrowUp':
                    currentLink = document.querySelector('.internal-wrapper a:focus')
                    linkList = Array.from(document.querySelectorAll('.internal-wrapper a:not([hidden])')).reverse()
                    savedLink = selectLink(currentLink, linkList) || savedLink
                    break
                case 'ArrowRight':
                    currentLink = document.querySelector('.site-nav a:focus')
                    linkList = Array.from(document.querySelectorAll('.site-nav a'))
                    selectLink(currentLink, linkList)
                    break
                case 'ArrowLeft':
                    currentLink = document.querySelector('.site-nav a:not([hidden]):focus')
                    linkList = Array.from(document.querySelectorAll('.site-nav a:not([hidden])')).reverse()
                    selectLink(currentLink, linkList)
            }
        }

        function selectLink(currentLink, linkList) {
            const currentLinkIndex = linkList.indexOf(currentLink)
            if (currentLinkIndex === -1) return undefined

            const nextLink = linkList[currentLinkIndex + 1] || currentLink
            nextLink.focus()
            return nextLink
        }
    });
});
