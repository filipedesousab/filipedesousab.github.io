class WelcomeModal {
    static modal = undefined
    static closeButton = undefined
    static rememberButton = undefined
    static afterCloseHooks = []

    static addAfterCloseHook(hook) {
        this.afterCloseHooks.push(hook)
    }

    static runAfterCloseHooks() {
        this.afterCloseHooks.forEach(hook => hook())
    }

    static load() {
        this.modal = document.getElementById('welcome')
        this.closeButton = this.modal.querySelector('#close-button')
        this.rememberButton = this.modal.querySelector('#remember-button')
        this.helpButton = document.querySelector('.page-link.help')

        this.closeButton.addEventListener('click', this.close.bind(this))
        this.rememberButton.addEventListener('click', this.closeAndRemember.bind(this))
        this.helpButton.addEventListener('click', this.open.bind(this))
    }

    static loaded() {
        return !!this.modal
    }

    static modalIsOpen() {
        return this.loaded() && this.modal.style.display === 'flex'
    }

    static storageName() {
        return 'modalShow'
    }

    static rememberedClosing() {
        return localStorage.getItem(this.storageName()) === 'true' || sessionStorage.getItem(this.storageName()) === 'true'
    }

    static rememberClosing() {
        localStorage.setItem(this.storageName(), true)
    }

    static rememberClosingInTheSession() {
        sessionStorage.setItem(this.storageName(), true)
    }

    static forgetClosing() {
        localStorage.setItem(this.storageName(), false)
    }

    static open() {
        this.forgetClosing()
        this.modal.style.display = 'flex'
    }

    static tryToOpen() {
        if (this.loaded() && !this.rememberedClosing()) {
            this.open()
            return true
        }
        return false
    }

    static close(event) {
        this.rememberClosingInTheSession()
        event.target.classList.add('active')
        setTimeout(() => {
            event.target.classList.remove('active')
        }, 100)
        setTimeout(() => {
            this.modal.style.display = 'none'
            this.runAfterCloseHooks()
        }, 200)
    }

    static closeAndRemember(event) {
        this.close(event)
        this.rememberClosing()
    }

    static navegate(event) {
        switch (event.key) {
            case 'ArrowRight':
                this.rememberButton && this.rememberButton.focus()
                break
            case 'Enter':
                if (document.activeElement == this.rememberButton) break
            case 'ArrowLeft':
            default:
                this.closeButton && this.closeButton.focus()
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    function focusOnTheWrapper() {
        const menuLink = document.querySelector('.site-nav a:focus')
        if (menuLink) menuLink.blur()

        document.querySelector('.internal-wrapper').focus()
    }

    WelcomeModal.load()
    WelcomeModal.addAfterCloseHook(focusOnTheWrapper)
    WelcomeModal.tryToOpen() || focusOnTheWrapper()

    function animateThePressedButton(event) {
        const currentLink = document.querySelector('.internal-wrapper a:focus')
        if (currentLink) {
            event.preventDefault()
            currentLink.classList.add('active')
            setTimeout(() => {
                currentLink.classList.remove('active')
            }, 100)
            setTimeout(() => {
                if (currentLink.href) window.location.href = currentLink.href
            }, 200)
        }
    }

    function getVisibleLinks() {
        const internalWrapper = document.querySelector('.internal-wrapper')
        const allLinks = Array.from(document.querySelectorAll('.internal-wrapper a:not([hidden])'))
        const internalWrapperRect = internalWrapper.getBoundingClientRect()

        return allLinks.filter(link => {
            const linkRect = link.getBoundingClientRect()
            return linkRect.top < internalWrapperRect.bottom && linkRect.bottom > internalWrapperRect.top
        })
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
        if (WelcomeModal.modalIsOpen()) {
            WelcomeModal.navegate(event)
            return
        }

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
                case '?':
                    document.querySelector('.page-link.help').focus()
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
    })
})
