document.addEventListener('DOMContentLoaded', function () {
    function focusOnTheWrapper() {
        const menuLink = document.querySelector('.site-nav a:focus')
        if (menuLink) menuLink.blur()

        document.querySelector('.internal-wrapper').focus()
    }

    const modal = document.getElementById('welcome')
    let closeButton = undefined
    let rememberButton = undefined

    if (modal && !localStorage.getItem('modalShow')) {
        closeButton = modal.querySelector('#close-button')
        rememberButton = modal.querySelector('#remember-button')

        function openModal() {
            modal.style.display = 'flex'
        }
        openModal()

        function closeModal(event) {
            if (event.target == rememberButton) localStorage.setItem('modalShow', true)

            event.target.classList.add('active')
            setTimeout(() => {
                event.target.classList.remove('active')
            }, 100);
            setTimeout(() => {
                modal.style.display = 'none'
                focusOnTheWrapper()
            }, 200);
        }

        closeButton.addEventListener('click', closeModal)
        rememberButton.addEventListener('click', closeModal)
    } else {
        focusOnTheWrapper()
    }

    function focusOnTheOpenModal(event) {
        if (modal && window.getComputedStyle(modal).display === 'flex') {
            switch (event.key) {
                case 'Enter':
                    break;
                case 'ArrowRight':
                    rememberButton && rememberButton.focus()
                    break
                case 'ArrowLeft':
                default:
                    closeButton && closeButton.focus()
            }
        }
    }

    function animateThePressedButton(event) {
        const currentLink = document.querySelector('.internal-wrapper a:focus')
        if (currentLink) {
            event.preventDefault()
            currentLink.classList.add('active')
            setTimeout(() => {
                currentLink.classList.remove('active')
            }, 100);
            setTimeout(() => {
                if (currentLink.href) window.location.href = currentLink.href
            }, 200);
        }
    }

    function getVisibleLinks() {
        const internalWrapper = document.querySelector('.internal-wrapper');
        const allLinks = Array.from(document.querySelectorAll('.internal-wrapper a:not([hidden])'));
        const internalWrapperRect = internalWrapper.getBoundingClientRect();

        return allLinks.filter(link => {
            const linkRect = link.getBoundingClientRect();
            return linkRect.top < internalWrapperRect.bottom && linkRect.bottom > internalWrapperRect.top;
        });
    }

    function selectLink(direction) {
        const currentLink = document.querySelector('.internal-wrapper a:focus')
        const visibleLinks = getVisibleLinks()

        if (!currentLink) {
            visibleLinks[0] && visibleLinks[0].focus({ preventScroll: true })
            return
        } else if (visibleLinks.length === 0) {
            focusOnTheWrapper()
            return
        }

        const currentLinkIndex = visibleLinks.indexOf(currentLink)

        if (currentLinkIndex < 0) {
            direction > 0 ? visibleLinks[0].focus({ preventScroll: true }) : visibleLinks[visibleLinks.length - 1].focus({ preventScroll: true })
        }

        const nextVisibleLink = visibleLinks[currentLinkIndex + direction]
        nextVisibleLink && nextVisibleLink.focus({ preventScroll: true })
    }

    function selectMenuLink(direction) {
        const currentMenuLink = document.querySelector('.site-nav a:focus')

        if (!currentMenuLink) return

        const menuLinkList = Array.from(document.querySelectorAll('.site-nav a'))
        const currentMenuLinkIndex = menuLinkList.indexOf(currentMenuLink)
        const nextLink = menuLinkList[currentMenuLinkIndex + direction] || currentMenuLink
        nextLink.focus()
    }

    document.addEventListener('keydown', function (event) {
        focusOnTheOpenModal(event)

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
                case 's':
                case 'S':
                    document.querySelector('.page-link.s').focus()
                    break
                default:
                    event.preventDefault()
                    document.querySelector('.page-link.h').focus()
            }
        } else {
            switch (event.key) {
                case 'Escape':
                    focusOnTheWrapper()
                    break
                case 'Enter':
                    animateThePressedButton(event)
                    break
                case 'ArrowDown':
                    selectLink(1)
                    break
                case 'ArrowUp':
                    selectLink(-1)
                    break
                case 'ArrowRight':
                    selectMenuLink(1)
                    break
                case 'ArrowLeft':
                    selectMenuLink(-1)
            }
        }
    });
});
