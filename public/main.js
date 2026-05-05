/* NDA gate: shown only after sign-in; acceptance stored per user via API */
;(function () {
  var overlay = document.getElementById('nda-overlay')
  var acceptBtn = document.getElementById('nda-accept')
  var body = document.getElementById('body')

  if (!body || !overlay || !acceptBtn) return

  overlay.hidden = true

  function setConfirmed() {
    overlay.hidden = true
    body.classList.add('nda-confirmed')
  }

  window.__prestixShowNdaIfNeeded = function (accepted) {
    if (accepted) {
      body.classList.add('nda-confirmed')
      overlay.hidden = true
    } else {
      overlay.hidden = false
    }
  }

  /* Only call after sign-in; show NDA only when API returns accepted: false (never on error/401) */
  window.__prestixCheckNdaAndShowIfNeeded = function () {
    fetch('/api/nda', { credentials: 'include' })
      .then(function (r) {
        if (r.status === 401) {
          overlay.hidden = true
          return null
        }
        return r.json()
      })
      .then(function (data) {
        if (data && typeof window.__prestixShowNdaIfNeeded === 'function') {
          window.__prestixShowNdaIfNeeded(!!data.accepted)
        } else {
          overlay.hidden = true
        }
      })
      .catch(function () {
        overlay.hidden = true
      })
  }

  acceptBtn.addEventListener('click', function () {
    var btn = acceptBtn
    if (btn.disabled) return
    btn.disabled = true
    fetch('/api/nda', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(function (res) { return res.json() })
      .then(function (data) {
        if (data && data.accepted) {
          setConfirmed()
        }
      })
      .catch(function () {})
      .then(function () {
        btn.disabled = false
      })
  })
})()

/* Toast notification: non-blocking message (replaces alert for profile save, etc.) */
;(function () {
  var TOAST_DURATION = 4500
  function showToast(message, type) {
    var container = document.getElementById('toast-container')
    if (!container) return
    var toast = document.createElement('div')
    toast.className = 'toast' + (type === 'error' ? ' toast--error' : type === 'success' ? ' toast--success' : '')
    toast.setAttribute('role', 'status')
    toast.textContent = message
    container.appendChild(toast)
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast)
    }, TOAST_DURATION)
  }
  window.__prestixToast = showToast
})()

/* Sign in / Sign up modal: required before any content; no skip/close — must sign in to proceed */
;(function () {
  var modal = document.getElementById('signin-signup-modal')
  var backdrop = document.getElementById('signin-signup-backdrop')
  var closeBtn = document.getElementById('signin-signup-close')
  var skipWrap = document.querySelector('.signin-signup-skip-wrap')
  var googleBtn = document.getElementById('signin-signup-google-btn')
  var tabSignin = document.getElementById('signin-signup-tab-signin')
  var tabSignup = document.getElementById('signin-signup-tab-signup')
  var formSignin = document.getElementById('signin-signup-form-signin')
  var formSignup = document.getElementById('signin-signup-form-signup')
  var errorSignin = document.getElementById('signin-signup-error-signin')
  var errorSignup = document.getElementById('signin-signup-error-signup')

  if (skipWrap) skipWrap.hidden = true
  if (closeBtn) closeBtn.hidden = true

  function showModal() {
    if (modal) {
      modal.classList.remove('hide')
      modal.hidden = false
      modal.removeAttribute('hidden')
    }
  }

  function hasUserDataInStorage() {
    try {
      return !!(localStorage.getItem('prestix-user-id') || sessionStorage.getItem('prestix-user-id'))
    } catch (e) {
      return false
    }
  }

  function hideModal() {
    if (!modal) return
    if (hasUserDataInStorage()) {
      modal.classList.add('hide')
    }
    modal.hidden = true
    modal.setAttribute('hidden', 'true')
  }

  function closeModal() {
    hideModal()
    if (typeof window.__prestixCheckNdaAndShowIfNeeded === 'function') {
      window.__prestixCheckNdaAndShowIfNeeded()
    }
    if (typeof window.__prestixOnSessionReady === 'function') {
      window.__prestixOnSessionReady()
    }
  }

  window.__prestixShowSigninModal = showModal
  window.__prestixHideSigninModal = hideModal

  function setError(el, msg) {
    if (!el) return
    el.textContent = msg || ''
    el.hidden = !msg
  }

  function getCallbackUrl() {
    var base = window.location.origin + (window.location.pathname || '/')
    return base.replace(/\/?$/, '') + '/'
  }

  /* No close/skip/backdrop — user must sign in to proceed */

  if (googleBtn) {
    googleBtn.href = '/api/auth/signin?callbackUrl=' + encodeURIComponent(getCallbackUrl())
    googleBtn.addEventListener('click', function (e) {
      e.preventDefault()
      window.location.href = googleBtn.href
    })
  }

  if (tabSignin && tabSignup && formSignin && formSignup) {
    tabSignin.addEventListener('click', function () {
      tabSignin.classList.add('active')
      tabSignin.setAttribute('aria-selected', 'true')
      tabSignup.classList.remove('active')
      tabSignup.setAttribute('aria-selected', 'false')
      formSignin.hidden = false
      formSignup.hidden = true
      setError(errorSignin, '')
      setError(errorSignup, '')
    })
    tabSignup.addEventListener('click', function () {
      tabSignup.classList.add('active')
      tabSignup.setAttribute('aria-selected', 'true')
      tabSignin.classList.remove('active')
      tabSignin.setAttribute('aria-selected', 'false')
      formSignup.hidden = false
      formSignin.hidden = true
      setError(errorSignin, '')
      setError(errorSignup, '')
    })
  }

  if (formSignin) {
    formSignin.addEventListener('submit', function (e) {
      e.preventDefault()
      var email = (formSignin.querySelector('[name="email"]') || {}).value
      var password = (formSignin.querySelector('[name="password"]') || {}).value
      if (!email || !password) return
      setError(errorSignin, '')
      var submitBtn = formSignin.querySelector('button[type="submit"]')
      if (submitBtn) submitBtn.disabled = true
      fetch('/api/auth/credentials/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password: password }),
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data } }) })
        .then(function (result) {
          if (submitBtn) submitBtn.disabled = false
          if (result.ok) {
            closeModal()
            if (typeof window.__prestixCheckSession === 'function') window.__prestixCheckSession()
          } else {
            setError(errorSignin, result.data && result.data.error ? result.data.error : 'Sign in failed.')
          }
        })
        .catch(function () {
          if (submitBtn) submitBtn.disabled = false
          setError(errorSignin, 'Sign in failed. Try again.')
        })
    })
  }

  var forgotBtn = document.getElementById('signin-forgot-password-btn')
  var forgotBlock = document.getElementById('signin-forgot-block')
  var forgotBackBtn = document.getElementById('signin-forgot-back-btn')
  var forgotEmailInput = document.getElementById('signin-forgot-email')
  var sendResetBtn = document.getElementById('signin-send-reset-btn')
  var errorForgot = document.getElementById('signin-signup-error-forgot')

  function showForgotBlock() {
    if (formSignin) formSignin.hidden = true
    if (forgotBlock) forgotBlock.hidden = false
    setError(errorSignin, '')
    if (errorForgot) setError(errorForgot, '')
    if (forgotEmailInput) forgotEmailInput.value = (formSignin && formSignin.querySelector('[name="email"]')) ? formSignin.querySelector('[name="email"]').value : ''
  }
  function hideForgotBlock() {
    if (forgotBlock) forgotBlock.hidden = true
    if (formSignin) formSignin.hidden = false
    if (errorForgot) setError(errorForgot, '')
  }

  if (forgotBtn) forgotBtn.addEventListener('click', showForgotBlock)
  if (forgotBackBtn) forgotBackBtn.addEventListener('click', hideForgotBlock)

  if (tabSignin && formSignin && forgotBlock) {
    tabSignin.addEventListener('click', function () { hideForgotBlock() })
  }

  if (sendResetBtn && forgotEmailInput) {
    sendResetBtn.addEventListener('click', function () {
      var email = (forgotEmailInput.value || '').trim()
      if (!email) {
        if (errorForgot) setError(errorForgot, 'Enter your email.')
        return
      }
      setError(errorForgot, '')
      sendResetBtn.disabled = true
      fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d } }) })
        .then(function (result) {
          sendResetBtn.disabled = false
          var msg = result.data && result.data.message ? result.data.message : 'Check your email for a link to set a new password.'
          if (errorForgot) setError(errorForgot, msg)
          if (result.ok && msg.indexOf('inbox') !== -1) forgotEmailInput.value = ''
        })
        .catch(function () {
          sendResetBtn.disabled = false
          if (errorForgot) setError(errorForgot, 'Request failed. Try again.')
        })
    })
  }

  if (formSignup) {
    formSignup.addEventListener('submit', function (e) {
      e.preventDefault()
      var email = (formSignup.querySelector('[name="email"]') || {}).value
      var password = (formSignup.querySelector('[name="password"]') || {}).value
      var name = (formSignup.querySelector('[name="name"]') || {}).value
      if (!email || !password) return
      setError(errorSignup, '')
      var submitBtn = formSignup.querySelector('button[type="submit"]')
      if (submitBtn) submitBtn.disabled = true
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password: password, name: (name || '').trim() }),
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data } }) })
        .then(function (result) {
          if (submitBtn) submitBtn.disabled = false
          if (result.ok || result.status === 201) {
            closeModal()
            if (typeof window.__prestixCheckSession === 'function') window.__prestixCheckSession()
          } else {
            setError(errorSignup, result.data && result.data.error ? result.data.error : 'Sign up failed.')
          }
        })
        .catch(function () {
          if (submitBtn) submitBtn.disabled = false
          setError(errorSignup, 'Sign up failed. Try again.')
        })
    })
  }

})()

/* Gate: require sign-in then NDA; no bypass — session check runs first */
;(function () {
  function ensureNdaHidden() {
    var overlay = document.getElementById('nda-overlay')
    if (overlay) overlay.hidden = true
  }
  function ensureSigninModalHidden() {
    if (typeof window.__prestixHideSigninModal === 'function') {
      window.__prestixHideSigninModal()
    } else {
      var modal = document.getElementById('signin-signup-modal')
      if (modal) {
        modal.hidden = true
        modal.setAttribute('hidden', 'true')
      }
    }
  }
  fetch('/api/auth/session', { credentials: 'include' })
    .then(function (res) { return res.json() })
    .then(function (data) {
      if (!data || !data.user) {
        ensureNdaHidden()
        if (typeof window.__prestixShowSigninModal === 'function') {
          window.__prestixShowSigninModal()
        }
      } else {
        try {
          var uid = data.user.id || data.user.sub || ''
          if (uid) {
            sessionStorage.setItem('prestix-user-id', String(uid))
          }
        } catch (e) {}
        ensureSigninModalHidden()
        if (typeof window.__prestixCheckNdaAndShowIfNeeded === 'function') {
          window.__prestixCheckNdaAndShowIfNeeded()
        }
        fetch('/api/user/settings', { credentials: 'include' })
          .then(function (r) { return r.ok ? r.json() : null })
          .then(function (s) {
            if (!s) return
            if (s.theme && (s.theme === 'light' || s.theme === 'dark') && typeof window.__prestixSetTheme === 'function') {
              window.__prestixSetTheme(s.theme)
            }
            if (s.language && typeof window.__prestixSetLang === 'function') {
              window.__prestixSetLang(s.language)
              if (typeof window.__prestixApplyTranslations === 'function') window.__prestixApplyTranslations()
            }
          })
          .catch(function () {})
      }
    })
    .catch(function () {
      ensureNdaHidden()
      if (typeof window.__prestixShowSigninModal === 'function') {
        window.__prestixShowSigninModal()
      }
    })
})()

/* Role selector: All / Promoter / Partner / Organizer — hash #all #promoter #partner #organizer */
;(function () {
  var AUDIENCE_KEY = 'prestix-audience'
  var VALID_HASHES = ['all', 'promoter', 'partner', 'organizer']
  var body = document.getElementById('body')
  var mainContent = document.getElementById('main-content')

  function getAudienceFromHash() {
    var hash = (window.location.hash || '').replace(/^#/, '').toLowerCase()
    if (hash === 'all' || hash === '') return null
    if (hash === 'promoter' || hash === 'partner' || hash === 'organizer') return hash
    return undefined
  }

  function getAudience() {
    var fromHash = getAudienceFromHash()
    if (fromHash !== undefined) return fromHash
    try {
      var stored = sessionStorage.getItem(AUDIENCE_KEY)
      if (stored === 'all' || stored === '') return null
      if (stored === 'promoter' || stored === 'partner' || stored === 'organizer') return stored
      return null
    } catch (e) {
      return null
    }
  }

  function updateHeroTagline(audience) {
    var heroTagline = document.getElementById('hero-tagline')
    if (!heroTagline) return
    var t = typeof window.__prestixT === 'function' && window.__prestixT
    var key = audience ? 'hero.tagline_' + audience : 'hero.tagline'
    var fallbackKey = 'hero.tagline'
    var text = t ? (t(key) || t(fallbackKey) || 'Promote & Earn.') : 'Promote & Earn.'
    heroTagline.setAttribute('data-i18n-html', '')
    heroTagline.innerHTML = text
    heroTagline.setAttribute('data-i18n', key)
  }

  function setAudience(audience) {
    var hash = audience ? audience : 'all'
    try {
      window.history.replaceState(null, '', '#' + hash)
    } catch (e) {}
    if (audience) {
      try {
        sessionStorage.setItem(AUDIENCE_KEY, audience)
      } catch (e) {}
    } else {
      try {
        sessionStorage.removeItem(AUDIENCE_KEY)
      } catch (e) {}
    }
    body.classList.remove('audience-patron', 'audience-promoter', 'audience-management', 'audience-investor', 'audience-partner', 'audience-marketplace', 'audience-organizer')
    if (audience) body.classList.add('audience-' + audience)
    if (mainContent) {
      if (audience) mainContent.classList.add('audience-chosen')
      else mainContent.classList.remove('audience-chosen')
    }
    document.querySelectorAll('.role-option[data-audience]').forEach(function (btn) {
      var btnAudience = btn.getAttribute('data-audience')
      btn.setAttribute('aria-pressed', (btnAudience === 'all' ? !audience : btnAudience === audience) ? 'true' : 'false')
    })
    updateHeroTagline(audience)
    try {
      window.dispatchEvent(new CustomEvent('prestix:audience-change', { detail: audience }))
    } catch (e) {}
  }

  window.__prestixGetAudience = getAudience
  window.__prestixUpdateHeroTagline = updateHeroTagline

  function init() {
    var audience = getAudience()
    if (audience === 'promoter' || audience === 'partner' || audience === 'organizer') {
      setAudience(audience)
      return
    }
    setAudience(null)
  }

  init()

  window.addEventListener('hashchange', function () {
    var fromHash = getAudienceFromHash()
    if (fromHash !== undefined && fromHash !== null) setAudience(fromHash)
    else setAudience(null)
  })

  document.querySelectorAll('.role-option[data-audience]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var audience = btn.getAttribute('data-audience')
      if (audience === 'all') setAudience(null)
      else if (audience) setAudience(audience)
    })
  })

  var HERO_AUDIENCES = ['all', 'partner', 'organizer', 'promoter']
  function getHeroCarouselIndex() {
    var cur = getAudience()
    if (cur === null) return 0
    var idx = HERO_AUDIENCES.indexOf(cur)
    return idx >= 0 ? idx : 0
  }
  var prevBtn = document.getElementById('hero-carousel-prev')
  var nextBtn = document.getElementById('hero-carousel-next')
  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      var idx = (getHeroCarouselIndex() - 1 + HERO_AUDIENCES.length) % HERO_AUDIENCES.length
      var nextAudience = HERO_AUDIENCES[idx]
      setAudience(nextAudience === 'all' ? null : nextAudience)
    })
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      var idx = (getHeroCarouselIndex() + 1) % HERO_AUDIENCES.length
      var nextAudience = HERO_AUDIENCES[idx]
      setAudience(nextAudience === 'all' ? null : nextAudience)
    })
  }
})()

/* Role selector: show role icons in footer when section is scrolled out (above or below view); header strip not used */
;(function () {
  var section = document.getElementById('choose-role')
  var headerStrip = document.getElementById('header-role-strip')
  var footerStrip = document.getElementById('footer-role-strip')
  if (!section) return

  function updateRoleStripVisibility() {
    var rect = section.getBoundingClientRect()
    var vh = window.innerHeight
    var below = rect.top > vh
    var above = rect.bottom < 0
    var inView = !above && !below
    section.classList.toggle('is-stuck', above)
    if (headerStrip) {
      headerStrip.setAttribute('hidden', '')
    }
    if (footerStrip) {
      if (inView) footerStrip.setAttribute('hidden', '')
      else footerStrip.removeAttribute('hidden')
    }
  }

  var ticking = false
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(function () {
        updateRoleStripVisibility()
        ticking = false
      })
      ticking = true
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  updateRoleStripVisibility()
})()

/* Profile questionnaire in drawer step 1: completion %, save to localStorage, upload when canUpload (RESEND_TEST_TO) */
;(function () {
  var PROFILE_STORAGE_KEY = 'prestix-profile-data'
  var questionnaire = document.getElementById('drawer-profile-questionnaire')
  var form = document.getElementById('drawer-profile-form')
  var completionEl = document.getElementById('drawer-profile-completion')
  var saveBtn = document.getElementById('drawer-profile-save')
  var roleOptions = document.getElementById('drawer-role-options')
  if (!questionnaire || !form) return

  var fieldsByAudience = {
    promoter: ['name', 'email', 'companyOrHandle', 'eventTypes', 'volume', 'howHeard', 'comments'],
    partner: ['name', 'email', 'venueName', 'roleAtVenue', 'market', 'howHeard', 'comments'],
    marketplace: ['name', 'howHeard', 'comments']
  }
  var optionalFields = ['volume', 'market', 'comments']

  function getAudience() {
    return typeof window.__prestixGetAudience === 'function' ? window.__prestixGetAudience() : null
  }
  function getProfileData() {
    try {
      var raw = localStorage.getItem(PROFILE_STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch (e) {
      return {}
    }
  }
  function setProfileData(data) {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data))
    } catch (e) {}
  }

  function getFormData() {
    var audience = getAudience()
    var data = { profileType: audience || 'promoter' }
    form.querySelectorAll('input:not([type="checkbox"]), textarea').forEach(function (el) {
      var name = el.getAttribute('name')
      if (name) data[name] = (el.value || '').trim()
    })
    form.querySelectorAll('input[name="eventTypes"]:checked').forEach(function (el) {
      var v = (data.eventTypes || '') ? data.eventTypes + ', ' + el.value : el.value
      data.eventTypes = v
    })
    if (!data.eventTypes) data.eventTypes = ''
    form.querySelectorAll('select').forEach(function (el) {
      var name = el.getAttribute('name')
      if (name) data[name] = (el.value || '').trim()
    })
    return data
  }
  function setFormData(data) {
    form.querySelectorAll('input:not([type="checkbox"]), textarea').forEach(function (el) {
      var name = el.getAttribute('name')
      if (name && data[name] !== undefined) el.value = data[name]
    })
    form.querySelectorAll('input[name="eventTypes"]').forEach(function (el) {
      var list = (data.eventTypes || '').split(',').map(function (s) { return s.trim() })
      el.checked = list.indexOf(el.value) >= 0
    })
    form.querySelectorAll('select').forEach(function (el) {
      var name = el.getAttribute('name')
      if (name && data[name] !== undefined) el.value = data[name]
    })
    refreshProfileSelectTriggers()
  }

  function refreshProfileSelectTriggers() {
    form.querySelectorAll('.drawer-profile-select-wrap').forEach(function (wrap) {
      var sel = wrap.querySelector('.drawer-profile-select-native')
      var trigger = wrap.querySelector('.drawer-profile-select-trigger')
      var dropdown = wrap.querySelector('.drawer-profile-select-dropdown')
      if (!sel || !trigger || !dropdown) return
      var val = sel.value || ''
      var opt = sel.querySelector('option[value="' + val.replace(/"/g, '&quot;') + '"]')
      trigger.textContent = opt ? opt.textContent.trim() : '—'
      dropdown.querySelectorAll('.drawer-profile-select-option').forEach(function (btn) {
        btn.classList.toggle('is-active', (btn.getAttribute('data-value') || '') === val)
      })
    })
  }

  function closeAllProfileSelectDropdowns() {
    form.querySelectorAll('.drawer-profile-select-dropdown').forEach(function (el) { el.hidden = true })
    form.querySelectorAll('.drawer-profile-select-trigger').forEach(function (el) { el.setAttribute('aria-expanded', 'false') })
  }

  function initProfileSelectDropdowns() {
    form.querySelectorAll('.drawer-profile-select-wrap').forEach(function (wrap) {
      var sel = wrap.querySelector('.drawer-profile-select-native')
      var trigger = wrap.querySelector('.drawer-profile-select-trigger')
      var dropdown = wrap.querySelector('.drawer-profile-select-dropdown')
      if (!sel || !trigger || !dropdown) return
      trigger.addEventListener('click', function () {
        var isOpen = !dropdown.hidden
        closeAllProfileSelectDropdowns()
        if (!isOpen) {
          dropdown.hidden = false
          trigger.setAttribute('aria-expanded', 'true')
        }
      })
      dropdown.querySelectorAll('.drawer-profile-select-option').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var val = btn.getAttribute('data-value') || ''
          sel.value = val
          trigger.textContent = btn.textContent.trim()
          dropdown.querySelectorAll('.drawer-profile-select-option').forEach(function (b) { b.classList.remove('is-active') })
          btn.classList.add('is-active')
          closeAllProfileSelectDropdowns()
          var ev = new Event('change', { bubbles: true })
          sel.dispatchEvent(ev)
        })
      })
    })
    document.addEventListener('click', function (e) {
      if (e.target.closest('.drawer-profile-select-wrap')) return
      closeAllProfileSelectDropdowns()
    })
    refreshProfileSelectTriggers()
  }
  initProfileSelectDropdowns()

  function showFieldsFor(audience) {
    form.querySelectorAll('.drawer-profile-field').forEach(function (el) {
      var forAttr = (el.getAttribute('data-for') || '').trim()
      var show = forAttr.split(/\s+/).indexOf(audience) >= 0
      el.classList.toggle('visible', show)
    })
  }

  function getCompletionPercent() {
    var audience = getAudience()
    var fields = fieldsByAudience[audience]
    if (!fields || fields.length === 0) return 0
    var required = fields.filter(function (name) { return optionalFields.indexOf(name) < 0 })
    if (required.length === 0) return 100
    var filled = 0
    required.forEach(function (name) {
      if (name === 'eventTypes') {
        var any = form.querySelector('input[name="eventTypes"]:checked')
        if (any) filled++
      } else {
        var el = form.querySelector('[name="' + name + '"]')
        if (el && (el.value || '').trim()) filled++
      }
    })
    return Math.round((filled / required.length) * 100)
  }

  function updateCompletionLabel() {
    var audience = getAudience()
    var pct = getCompletionPercent()
    var t = typeof window.__prestixT === 'function' && window.__prestixT
    var msg = t ? (t('profile.completion') || 'Profile {p}% complete').replace('{p}', pct) : 'Profile ' + pct + '% complete'
    if (completionEl) {
      if (audience === 'organizer') {
        completionEl.textContent = ''
        completionEl.hidden = true
      } else {
        completionEl.textContent = msg
        completionEl.hidden = false
      }
    }
    var headerStatus = document.getElementById('nav-drawer-profile-status')
    if (headerStatus) {
      if (audience === 'organizer') {
        headerStatus.textContent = ''
        headerStatus.hidden = true
      } else {
        var statusMsg = t ? (t('profile.status_complete') || '{p}% Complete').replace('{p}', pct) : pct + '% Complete'
        headerStatus.textContent = statusMsg
        headerStatus.hidden = false
      }
    }
  }

  function showQuestionnaire() {
    var audience = getAudience()
    if (!audience) {
      questionnaire.hidden = true
      return
    }
    questionnaire.hidden = false
    showFieldsFor(audience)
    var stored = getProfileData()
    if (stored.profileType === audience) setFormData(stored)
    else { form.reset(); refreshProfileSelectTriggers() }
    var emailFromUser = typeof window.__prestixUser !== 'undefined' && window.__prestixUser && window.__prestixUser.email
    if (emailFromUser && form.querySelector('[name="email"]')) {
      var emailInput = form.querySelector('[name="email"]')
      if (!emailInput.value) emailInput.value = emailFromUser
    }
    updateCompletionLabel()
  }

  function persistForm() {
    var data = getFormData()
    setProfileData(data)
    updateCompletionLabel()
  }

  function onSaveClick() {
    persistForm()
    var data = getFormData()
    saveBtn.disabled = true
    fetch('/api/profile', { method: 'GET', credentials: 'include' })
      .then(function (r) { return r.json() })
      .then(function (getRes) {
        if (getRes.canUpload) {
          return fetch('/api/profile', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          }).then(function (r) { return r.json().then(function (body) { return { status: r.status, body: body } }) })
        }
        return { status: 200, body: { saved: false, canUpload: false } }
      })
      .then(function (result) {
        var t = typeof window.__prestixT === 'function' && window.__prestixT
        var msg = result.body && result.body.saved
          ? (t ? (t('profile.saved_uploaded') || 'Profile saved and sent to the team.') : 'Profile saved and sent to the team.')
          : (t ? (t('profile.saved_local') || 'Profile saved locally.') : 'Profile saved locally.')
        if (typeof window.__prestixToast === 'function') window.__prestixToast(msg, 'success')
        else alert(msg)
      })
      .catch(function () {
        var t = typeof window.__prestixT === 'function' && window.__prestixT
        var msg = t ? (t('profile.save_failed') || 'Could not save. Try again.') : 'Could not save. Try again.'
        if (typeof window.__prestixToast === 'function') window.__prestixToast(msg, 'error')
        else alert(msg)
      })
      .then(function () {
        saveBtn.disabled = false
        if (typeof window.__prestixCollapseDrawerToOverview === 'function') {
          window.__prestixCollapseDrawerToOverview()
        }
      })
  }

  form.addEventListener('input', persistForm)
  form.addEventListener('change', persistForm)
  if (saveBtn) saveBtn.addEventListener('click', onSaveClick)

  window.addEventListener('prestix:audience-change', showQuestionnaire)
  window.__prestixRefreshProfileQuestionnaire = showQuestionnaire
  window.__prestixGetProfileFormData = getFormData

  document.querySelectorAll('#drawer-step-1 .nav-drawer-role-option').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setTimeout(showQuestionnaire, 50)
    })
  })
})()

/* Theme toggle: light / dark, persisted in localStorage */
;(function () {
  var THEME_KEY = 'prestix-theme'
  var body = document.getElementById('body')
  var toggle = document.getElementById('theme-toggle')
  var metaTheme = document.querySelector('meta[name="theme-color"]')

  function getTheme() {
    try {
      return localStorage.getItem(THEME_KEY)
    } catch (e) {
      return null
    }
  }

  function setTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch (e) {}
    if (theme === 'light') {
      body.classList.add('theme-light')
      if (metaTheme) metaTheme.setAttribute('content', '#f5f5f5')
    } else {
      body.classList.remove('theme-light')
      if (metaTheme) metaTheme.setAttribute('content', '#0a0a0a')
    }
    if (typeof window.__prestixOnThemeChange === 'function') window.__prestixOnThemeChange(theme)
  }

  window.__prestixGetTheme = getTheme
  window.__prestixSetTheme = setTheme

  function init() {
    var theme = getTheme()
    if (theme === 'light' || theme === 'dark') {
      setTheme(theme)
      return
    }
    setTheme('dark')
  }

  init()

  function handleThemeClick() {
    var next = body.classList.contains('theme-light') ? 'dark' : 'light'
    setTheme(next)
  }
  if (toggle) toggle.addEventListener('click', handleThemeClick)
  var toggleDrawer = document.getElementById('theme-toggle-drawer')
  if (toggleDrawer) toggleDrawer.addEventListener('click', handleThemeClick)
})()

/* Hero benefit: now per-audience (patron/promoter/management), no random rotation */

/* Parallax scroll: hero background and content move at different rates for depth */
;(function () {
  var hero = document.querySelector('.hero')
  var wrapper = hero ? hero.querySelector('.parallax-wrapper') : null
  if (!hero || !wrapper) return

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) return

  var ticking = false

  function getScrollY() {
    return window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop ?? 0
  }

  function updateParallax() {
    var y = getScrollY()
    var vh = window.innerHeight
    var isMobile = window.innerWidth < 768
    /* Background and content move at different rates for depth */
    var BG_RATE = isMobile ? 0.06 : 0.1
    var CONTENT_RATE = isMobile ? 0.04 : 0.06

    var bgY = -y * BG_RATE
    var contentY = -y * CONTENT_RATE
    var fade = Math.min(1, y / (vh * 1.4))

    wrapper.style.setProperty('--parallax-bg-y', bgY + 'px')
    hero.style.setProperty('--parallax-content-y', contentY + 'px')
    hero.style.setProperty('--parallax-fade', fade)
    ticking = false
  }

  function onScroll() {
    if (!ticking) {
      ticking = true
      requestAnimationFrame(updateParallax)
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  updateParallax()
})()

/* Mobile nav: hamburger toggle */
;(function () {
  const header = document.getElementById('site-header')
  const toggle = document.getElementById('nav-toggle')
  const nav = document.getElementById('main-nav')

  if (!header || !toggle || !nav) return

  function openMenu() {
    header.classList.add('menu-open')
    document.body.classList.add('menu-open')
    toggle.setAttribute('aria-expanded', 'true')
    toggle.setAttribute('aria-label', 'Close menu')
  }

  function closeMenu() {
    header.classList.remove('menu-open')
    document.body.classList.remove('menu-open')
    toggle.setAttribute('aria-expanded', 'false')
    toggle.setAttribute('aria-label', 'Open menu')
  }

  function isMenuOpen() {
    return header.classList.contains('menu-open')
  }

  toggle.addEventListener('click', function () {
    if (isMenuOpen()) closeMenu()
    else openMenu()
  })

  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      closeMenu()
    })
  })

  nav.addEventListener('click', function (e) {
    if (e.target === nav) closeMenu()
  })

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isMenuOpen()) closeMenu()
  })
})()

/* Experience feedback: would you hire the bike? */
;(function () {
  var form = document.getElementById('feedback-hire-form')
  var thanks = document.getElementById('experience-feedback-thanks')

  function getUserId() {
    try {
      return localStorage.getItem('prestix-user-id') || sessionStorage.getItem('prestix-user-id') || null
    } catch (e) {
      return null
    }
  }

  function sendAnalytics(event, payload) {
    var body = {
      event: event,
      payload: payload || {},
      userId: getUserId(),
      timestamp: new Date().toISOString(),
    }
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    }).catch(function () {})
  }

  if (form) {
    function submitAnswer(value) {
      sendAnalytics('experience_hire_bike', { wouldHire: value })
      if (thanks) thanks.hidden = false
      form.querySelectorAll('input[name="hire_bike"]').forEach(function (radio) {
        radio.disabled = true
      })
    }
    form.querySelectorAll('input[name="hire_bike"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (this.checked) submitAnswer(this.value)
      })
    })
  }
})()

/* Header share button: on mobile use Web Share API (or copy); on desktop show WhatsApp / Instagram dropdown */
;(function () {
  var shareBtn = document.getElementById('header-share-btn')
  var shareDropdown = document.getElementById('header-share-dropdown')
  var shareWhatsApp = document.getElementById('header-share-whatsapp')
  var shareWrap = document.getElementById('header-share-wrap')
  if (!shareBtn) return

  function isDesktop() {
    return window.matchMedia && window.matchMedia('(min-width: 769px)').matches
  }

  function getShareUrl() { return window.location.href }
  function getShareTitle() { return document.title || 'Prestix.vip' }

  function openDesktopShare() {
    if (!shareDropdown || !shareWhatsApp) return
    var url = getShareUrl()
    var title = getShareTitle()
    var text = title + ' ' + url
    shareWhatsApp.href = 'https://wa.me/?text=' + encodeURIComponent(text)
    shareDropdown.hidden = false
    shareBtn.setAttribute('aria-expanded', 'true')
  }

  function closeDesktopShare() {
    if (!shareDropdown) return
    shareDropdown.hidden = true
    shareBtn.setAttribute('aria-expanded', 'false')
  }

  shareBtn.addEventListener('click', function () {
    if (isDesktop()) {
      if (shareDropdown && shareDropdown.hidden) {
        openDesktopShare()
      } else {
        closeDesktopShare()
      }
      return
    }
    /* Mobile: existing behaviour – Web Share API or copy link */
    var url = getShareUrl()
    var title = getShareTitle()
    if (typeof navigator.share === 'function') {
      navigator.share({ title: title, url: url }).catch(function () {
        copyUrlFallback(url)
      })
    } else {
      copyUrlFallback(url)
    }
  })

  function copyUrlFallback(url) {
    if (typeof navigator.clipboard !== 'undefined' && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        if (typeof window.__prestixToast === 'function') window.__prestixToast('Link copied')
      }).catch(function () {})
    }
  }

  document.addEventListener('click', function (e) {
    if (!isDesktop() || !shareWrap || !shareDropdown) return
    if (shareDropdown.hidden) return
    if (shareWrap.contains(e.target)) return
    closeDesktopShare()
  })

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDesktopShare()
  })
})()

/* Right-hand drawer: open/close and partner onboarding steps; no backdrop, main resizes */
;(function () {
  var DRAWER_STEPS = 9
  var btn = document.getElementById('account-menu-btn')
  var drawer = document.getElementById('nav-drawer')
  var siteWrap = document.getElementById('site-wrap')
  var closeBtn = document.getElementById('nav-drawer-close')
  var progressBar = document.getElementById('nav-drawer-progress-bar')
  var stepLabel = document.getElementById('nav-drawer-step-label')
  var stepsContainer = document.getElementById('nav-drawer-steps')
  var prevBtn = document.getElementById('nav-drawer-prev')
  var nextBtn = document.getElementById('nav-drawer-next')
  var userDataProfile = document.getElementById('nav-drawer-user-data-profile')
  var userDataAvatarWrap = document.getElementById('nav-drawer-user-data-avatar-wrap')
  var userDataEmailEl = document.getElementById('nav-drawer-user-data-email')
  var userDataNameEl = document.getElementById('nav-drawer-user-data-name')
  var userDataSignedOut = document.getElementById('nav-drawer-user-data-signed-out')
  var drawerSignout = document.getElementById('nav-drawer-signout')
  var userDataContainer = document.getElementById('nav-drawer-user-data')
  var userDataToggle = document.getElementById('nav-drawer-user-data-toggle')
  var userDataContent = document.getElementById('nav-drawer-user-data-content')
  var stepsSection = document.getElementById('nav-drawer-steps-section')
  var accountPageStepsWrap = document.getElementById('account-page-steps-wrap')
  var accountPageProfileOverviewEl = document.getElementById('account-page-profile-overview')
  var profileOverviewEl = document.getElementById('nav-drawer-profile-overview')
  var profileOverviewList = document.getElementById('nav-drawer-profile-overview-list')
  var profileOverviewEditBtn = document.getElementById('nav-drawer-profile-overview-edit')
  var profileOverviewToggle = document.getElementById('nav-drawer-profile-overview-toggle')
  var DRAWER_ACCOUNT_EXPANDED_KEY = 'prestix_drawer_account_expanded'

  if (!btn || !drawer || !siteWrap) return

  function applyDrawerAccountExpanded(expanded) {
    if (!userDataContainer || !userDataToggle) return
    if (expanded) {
      userDataContainer.classList.remove('is-collapsed')
      userDataToggle.setAttribute('aria-expanded', 'true')
    } else {
      userDataContainer.classList.add('is-collapsed')
      userDataToggle.setAttribute('aria-expanded', 'false')
    }
    try { sessionStorage.setItem(DRAWER_ACCOUNT_EXPANDED_KEY, expanded ? 'true' : '') } catch (e) {}
  }
  function syncDrawerEditMode() {
    if (!drawer) return
    var isEditMode = accountPageStepsWrap && !accountPageStepsWrap.hidden
    drawer.classList.toggle('drawer-is-edit-mode', isEditMode)
  }
  function initDrawerAccountCollapse() {
    if (!userDataToggle || !userDataContent) return
    var expanded = false
    try { expanded = sessionStorage.getItem(DRAWER_ACCOUNT_EXPANDED_KEY) === 'true' } catch (e) {}
    applyDrawerAccountExpanded(expanded)
    userDataToggle.addEventListener('click', function () {
      var isCollapsed = userDataContainer && userDataContainer.classList.contains('is-collapsed')
      applyDrawerAccountExpanded(isCollapsed)
    })
  }
  initDrawerAccountCollapse()

  var currentStep = 1
  var ONBOARDING_STORAGE_KEY = 'prestix-profile-data'

  function getOnboardingAnswers() {
    try {
      var raw = localStorage.getItem(ONBOARDING_STORAGE_KEY)
      var data = raw ? JSON.parse(raw) : {}
      return data.onboardingAnswers || {}
    } catch (e) {
      return {}
    }
  }
  function setOnboardingAnswer(qKey, value) {
    try {
      var raw = localStorage.getItem(ONBOARDING_STORAGE_KEY)
      var data = raw ? JSON.parse(raw) : {}
      data.onboardingAnswers = data.onboardingAnswers || {}
      data.onboardingAnswers[qKey] = value == null ? '' : String(value).trim()
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data))
    } catch (e) {}
  }

  var DRAWER_OPTIONS = {
    interest_promoter: [ { value: '', labelKey: 'questions.opt_empty' }, { value: 'commission', labelKey: 'questions.opt_interest_commission' }, { value: 'event_types', labelKey: 'questions.opt_interest_events' }, { value: 'getting_started', labelKey: 'questions.opt_interest_getting_started' }, { value: 'volume', labelKey: 'questions.opt_interest_volume' }, { value: 'other', labelKey: 'questions.opt_other' } ],
    interest_partner: [ { value: '', labelKey: 'questions.opt_empty' }, { value: 'onboarding_promoters', labelKey: 'questions.opt_interest_onboarding' }, { value: 'integrate_venue', labelKey: 'questions.opt_interest_integrate' }, { value: 'dashboard_payouts', labelKey: 'questions.opt_interest_dashboard' }, { value: 'vip_alerts', labelKey: 'questions.opt_interest_vip_alerts' }, { value: 'roi_financials', labelKey: 'questions.opt_interest_roi' }, { value: 'other', labelKey: 'questions.opt_other' } ],
    interest_marketplace: [ { value: '', labelKey: 'questions.opt_empty' }, { value: 'vip_access', labelKey: 'questions.opt_interest_vip' }, { value: 'booking', labelKey: 'questions.opt_interest_booking' }, { value: 'partner_venues', labelKey: 'questions.opt_interest_venues' }, { value: 'roi_details', labelKey: 'questions.opt_interest_roi' }, { value: 'other', labelKey: 'questions.opt_other' } ],
    event_types: [ { value: '', labelKey: 'questions.opt_empty' }, { value: 'nightlife', labelKey: 'profile.event_nightlife' }, { value: 'concerts', labelKey: 'profile.event_concerts' }, { value: 'private_events', labelKey: 'profile.event_private' }, { value: 'corporate', labelKey: 'profile.event_corporate' }, { value: 'festivals', labelKey: 'profile.event_festivals' }, { value: 'sports', labelKey: 'profile.event_sports' }, { value: 'other', labelKey: 'questions.opt_other' } ],
    role_venue: [ { value: '', labelKey: 'questions.opt_empty' }, { value: 'gm', labelKey: 'profile.role_gm' }, { value: 'owner', labelKey: 'profile.role_owner' }, { value: 'events_manager', labelKey: 'profile.role_events_manager' }, { value: 'marketing', labelKey: 'profile.role_marketing' }, { value: 'other', labelKey: 'questions.opt_other' } ],
    how_heard: [ { value: '', labelKey: 'questions.opt_empty' }, { value: 'social_media', labelKey: 'profile.how_social' }, { value: 'referral', labelKey: 'profile.how_referral' }, { value: 'online_ad', labelKey: 'profile.how_online_ad' }, { value: 'event', labelKey: 'profile.how_event' }, { value: 'search', labelKey: 'profile.how_search' }, { value: 'other', labelKey: 'questions.opt_other' } ],
    volume: [ { value: '', labelKey: 'questions.opt_empty' }, { value: 'under_50', labelKey: 'profile.volume_under_50' }, { value: '50_200', labelKey: 'profile.volume_50_200' }, { value: '200_500', labelKey: 'profile.volume_200_500' }, { value: '500_plus', labelKey: 'profile.volume_500_plus' }, { value: 'prefer_not', labelKey: 'profile.volume_prefer_not' } ],
    contact: [ { value: '', labelKey: 'questions.opt_empty' }, { value: 'email', labelKey: 'questions.opt_contact_email' }, { value: 'call', labelKey: 'questions.opt_contact_call' }, { value: 'whatsapp', labelKey: 'questions.opt_contact_whatsapp' }, { value: 'other', labelKey: 'questions.opt_other' } ],
    timeline: [ { value: '', labelKey: 'questions.opt_empty' }, { value: 'asap', labelKey: 'questions.opt_timeline_asap' }, { value: '1_3_months', labelKey: 'questions.opt_timeline_1_3' }, { value: '3_6_months', labelKey: 'questions.opt_timeline_3_6' }, { value: 'exploring', labelKey: 'questions.opt_timeline_exploring' } ],
    venue_type: [ { value: '', labelKey: 'questions.opt_empty' }, { value: 'nightclub', labelKey: 'questions.opt_venue_nightclub' }, { value: 'restaurant', labelKey: 'questions.opt_venue_restaurant' }, { value: 'bar', labelKey: 'questions.opt_venue_bar' }, { value: 'event_space', labelKey: 'questions.opt_venue_event_space' }, { value: 'other', labelKey: 'questions.opt_other' } ],
    market_city: [
      { value: '', labelKey: 'questions.opt_empty' },
      { value: 'london', labelKey: 'questions.opt_market_london' },
      { value: 'paris', labelKey: 'questions.opt_market_paris' },
      { value: 'berlin', labelKey: 'questions.opt_market_berlin' },
      { value: 'madrid', labelKey: 'questions.opt_market_madrid' },
      { value: 'barcelona', labelKey: 'questions.opt_market_barcelona' },
      { value: 'amsterdam', labelKey: 'questions.opt_market_amsterdam' },
      { value: 'rome', labelKey: 'questions.opt_market_rome' },
      { value: 'milan', labelKey: 'questions.opt_market_milan' },
      { value: 'ibiza', labelKey: 'questions.opt_market_ibiza' },
      { value: 'new_york', labelKey: 'questions.opt_market_new_york' },
      { value: 'los_angeles', labelKey: 'questions.opt_market_la' },
      { value: 'miami', labelKey: 'questions.opt_market_miami' },
      { value: 'las_vegas', labelKey: 'questions.opt_market_las_vegas' },
      { value: 'chicago', labelKey: 'questions.opt_market_chicago' },
      { value: 'san_francisco', labelKey: 'questions.opt_market_san_francisco' },
      { value: 'toronto', labelKey: 'questions.opt_market_toronto' },
      { value: 'vancouver', labelKey: 'questions.opt_market_vancouver' },
      { value: 'mexico_city', labelKey: 'questions.opt_market_mexico_city' },
      { value: 'sydney', labelKey: 'questions.opt_market_sydney' },
      { value: 'melbourne', labelKey: 'questions.opt_market_melbourne' },
      { value: 'brisbane', labelKey: 'questions.opt_market_brisbane' },
      { value: 'tokyo', labelKey: 'questions.opt_market_tokyo' },
      { value: 'singapore', labelKey: 'questions.opt_market_singapore' },
      { value: 'hong_kong', labelKey: 'questions.opt_market_hong_kong' },
      { value: 'bangkok', labelKey: 'questions.opt_market_bangkok' },
      { value: 'dubai', labelKey: 'questions.opt_market_dubai' },
      { value: 'sao_paulo', labelKey: 'questions.opt_market_sao_paulo' },
      { value: 'buenos_aires', labelKey: 'questions.opt_market_buenos_aires' },
      { value: 'other', labelKey: 'questions.opt_other' }
    ]
  }

  var DRAWER_QUESTIONS = [
    { promoter: { titleKey: 'questions.q1.promoter.title', name: 'q1', type: 'select', optionsKey: 'interest_promoter', multiSelect: true }, partner: { titleKey: 'questions.q1.partner.title', name: 'q1', type: 'select', optionsKey: 'interest_partner', multiSelect: true }, organizer: { titleKey: 'questions.q1.marketplace.title', name: 'q1', type: 'select', optionsKey: 'interest_marketplace', multiSelect: true } },
    { promoter: { titleKey: 'questions.q2.promoter.title', name: 'q2', type: 'select', optionsKey: 'event_types' }, partner: { titleKey: 'questions.q2.partner.title', name: 'q2', type: 'select', optionsKey: 'role_venue' }, organizer: { titleKey: 'questions.q2.marketplace.title', name: 'q2', type: 'select', optionsKey: 'how_heard' } },
    { promoter: { titleKey: 'questions.q3.promoter.title', name: 'q3', type: 'select', optionsKey: 'volume' }, partner: { titleKey: 'questions.q3.partner.title', name: 'q3', type: 'select', optionsKey: 'market_city' }, organizer: { titleKey: 'questions.q3.marketplace.title', name: 'q3', type: 'textarea', placeholderKey: 'questions.q3.marketplace.placeholder' } },
    { promoter: { titleKey: 'questions.q4.promoter.title', name: 'q4', type: 'select', optionsKey: 'how_heard' }, partner: { titleKey: 'questions.q4.partner.title', name: 'q4', type: 'select', optionsKey: 'venue_type' }, organizer: { titleKey: 'questions.q4.marketplace.title', name: 'q4', type: 'select', optionsKey: 'how_heard' } },
    { promoter: { titleKey: 'questions.q5.promoter.title', name: 'q5', type: 'select', optionsKey: 'contact' }, partner: { titleKey: 'questions.q5.partner.title', name: 'q5', type: 'select', optionsKey: 'contact' }, organizer: { titleKey: 'questions.q5.marketplace.title', name: 'q5', type: 'select', optionsKey: 'contact' } },
    { promoter: { titleKey: 'questions.q6.promoter.title', name: 'q6', type: 'select', optionsKey: 'market_city', multiSelect: true }, partner: { titleKey: 'questions.q6.partner.title', name: 'q6', type: 'select', optionsKey: 'timeline' }, organizer: { titleKey: 'questions.q6.marketplace.title', name: 'q6', type: 'select', optionsKey: 'how_heard' } },
    { promoter: { titleKey: 'questions.q7.promoter.title', name: 'q7', type: 'text', placeholderKey: 'questions.q7.promoter.placeholder' }, partner: { titleKey: 'questions.q7.partner.title', name: 'q7', type: 'textarea', placeholderKey: 'questions.q7.partner.placeholder' }, organizer: { titleKey: 'questions.q7.marketplace.title', name: 'q7', type: 'text', placeholderKey: 'questions.q7.marketplace.placeholder' } },
    { promoter: { titleKey: 'questions.q8.promoter.title', name: 'q8', type: 'textarea', placeholderKey: 'questions.q8.promoter.placeholder' }, partner: { titleKey: 'questions.q8.partner.title', name: 'q8', type: 'textarea', placeholderKey: 'questions.q8.partner.placeholder' }, organizer: { titleKey: 'questions.q8.marketplace.title', name: 'q8', type: 'textarea', placeholderKey: 'questions.q8.marketplace.placeholder' } }
  ]

  function renderDrawerStepQuestion(step) {
    if (step < 2 || step > 9) return
    var audience = typeof window.__prestixGetAudience === 'function' ? window.__prestixGetAudience() : null
    if (!audience || ['promoter', 'partner', 'organizer'].indexOf(audience) < 0) audience = 'promoter'
    var idx = step - 2
    var config = DRAWER_QUESTIONS[idx] && DRAWER_QUESTIONS[idx][audience]
    var titleEl = document.getElementById('drawer-step-' + step + '-title')
    var textEl = document.getElementById('drawer-step-' + step + '-text')
    var questionEl = document.getElementById('drawer-step-' + step + '-question')
    if (!titleEl || !questionEl) return
    var t = typeof window.__prestixT === 'function' && window.__prestixT
    var answers = getOnboardingAnswers()
    if (!config) {
      titleEl.textContent = ''
      titleEl.hidden = true
      if (textEl) { textEl.textContent = ''; textEl.hidden = true }
      questionEl.innerHTML = ''
      return
    }
    titleEl.hidden = false
    titleEl.textContent = t ? (t(config.titleKey) || config.titleKey) : config.titleKey
    if (textEl) { textEl.textContent = ''; textEl.hidden = true }
    var name = config.name
    var value = answers[name] || ''
    var placeholder = (config.placeholderKey && t) ? t(config.placeholderKey) : ''
    questionEl.innerHTML = ''
    var label = document.createElement('label')
    label.setAttribute('for', 'drawer-onboarding-' + name)
    label.className = 'drawer-step-question-label'
    label.textContent = titleEl.textContent
    label.style.display = 'none'

    if (config.type === 'select' && config.optionsKey && DRAWER_OPTIONS[config.optionsKey]) {
      var opts = DRAWER_OPTIONS[config.optionsKey]
      var wrap = document.createElement('div')
      wrap.className = 'drawer-profile-select-wrap drawer-step-select-wrap' + (config.multiSelect ? ' is-multiselect' : '')
      var trigger = document.createElement('button')
      trigger.type = 'button'
      trigger.className = 'drawer-profile-select-trigger drawer-step-select-trigger'
      trigger.setAttribute('aria-haspopup', 'listbox')
      trigger.setAttribute('aria-expanded', 'false')
      var dropdown = document.createElement('div')
      dropdown.className = 'drawer-profile-select-dropdown'
      dropdown.setAttribute('role', 'listbox')
      dropdown.hidden = true

      var contactDetailKey = 'q5_contact_value'
      var subWrap = null
      var subLabel = null
      var subInput = null
      var updateContactSubfield = null
      if (config.optionsKey === 'contact') {
        subWrap = document.createElement('div')
        subWrap.className = 'drawer-step-contact-subfield'
        subLabel = document.createElement('label')
        subLabel.className = 'drawer-step-question-label'
        subLabel.setAttribute('for', 'drawer-onboarding-' + contactDetailKey)
        subInput = document.createElement('input')
        subInput.id = 'drawer-onboarding-' + contactDetailKey
        subInput.name = contactDetailKey
        subInput.className = 'drawer-profile-input drawer-step-question-input'
        subInput.setAttribute('data-onboarding-q', contactDetailKey)
        subInput.addEventListener('input', function () { setOnboardingAnswer(contactDetailKey, subInput.value) })
        subInput.addEventListener('change', function () { setOnboardingAnswer(contactDetailKey, subInput.value) })
        updateContactSubfield = function (method) {
          if (!subWrap || !subLabel || !subInput) return
          subWrap.hidden = !method || method === ''
          if (!method || method === '') return
          var userEmail = typeof window.__prestixUser !== 'undefined' && window.__prestixUser && window.__prestixUser.email ? window.__prestixUser.email : ''
          var stored = getOnboardingAnswers()[contactDetailKey] || ''
          if (method === 'email') {
            subLabel.textContent = t ? (t('questions.q5.contact_email_label') || 'Email address') : 'Email address'
            subInput.type = 'email'
            subInput.placeholder = t ? (t('questions.q5.contact_email_placeholder') || 'Your email') : 'Your email'
            subInput.value = (stored && stored.indexOf('@') > 0) ? stored : userEmail
            subInput.autocomplete = 'email'
          } else if (method === 'call' || method === 'whatsapp') {
            subLabel.textContent = method === 'whatsapp'
              ? (t ? (t('questions.q5.contact_whatsapp_label') || 'WhatsApp number') : 'WhatsApp number')
              : (t ? (t('questions.q5.contact_call_label') || 'Phone number') : 'Phone number')
            subInput.type = 'tel'
            subInput.placeholder = method === 'whatsapp'
              ? (t ? (t('questions.q5.contact_whatsapp_placeholder') || 'Phone number with country code') : 'Phone number with country code')
              : (t ? (t('questions.q5.contact_call_placeholder') || 'Phone number') : 'Phone number')
            subInput.value = stored
            subInput.autocomplete = 'tel'
          } else {
            subLabel.textContent = t ? (t('questions.q5.contact_other_label') || 'Specify') : 'Specify'
            subInput.type = 'text'
            subInput.placeholder = t ? (t('questions.q5.contact_other_placeholder') || 'How should we contact you?') : 'How should we contact you?'
            subInput.value = stored
            subInput.removeAttribute('autocomplete')
          }
        }
      }

      if (config.multiSelect) {
        var selectedArr = (value || '').split(',').map(function (s) { return s.trim() }).filter(Boolean)
        var optsFiltered = opts.filter(function (o) { return (o.value || '').trim() !== '' })
        function getDisplayText(selected) {
          if (selected.length === 0) return placeholder || '—'
          var labels = selected.map(function (v) {
            var o = optsFiltered.filter(function (x) { return x.value === v })[0]
            return o ? (t ? (t(o.labelKey) || o.labelKey) : o.labelKey) : v
          })
          if (labels.length <= 2) return labels.join(', ')
          return labels.slice(0, 2).join(', ') + ' & ' + (labels.length - 2) + ' more'
        }
        trigger.textContent = getDisplayText(selectedArr)
        optsFiltered.forEach(function (o) {
          var optVal = o.value || ''
          var isSelected = selectedArr.indexOf(optVal) >= 0
          var btn = document.createElement('button')
          btn.type = 'button'
          btn.setAttribute('role', 'option')
          btn.setAttribute('aria-selected', isSelected ? 'true' : 'false')
          btn.className = 'drawer-profile-select-option drawer-profile-select-option-multi' + (isSelected ? ' is-active' : '')
          btn.setAttribute('data-value', optVal)
          btn.textContent = t ? (t(o.labelKey) || o.labelKey) : o.labelKey
          btn.addEventListener('click', function () {
            var idx = selectedArr.indexOf(optVal)
            if (idx >= 0) selectedArr.splice(idx, 1)
            else selectedArr.push(optVal)
            setOnboardingAnswer(name, selectedArr.join(','))
            dropdown.querySelectorAll('.drawer-profile-select-option').forEach(function (b) {
              var v = b.getAttribute('data-value')
              var sel = selectedArr.indexOf(v) >= 0
              b.classList.toggle('is-active', sel)
              b.setAttribute('aria-selected', sel ? 'true' : 'false')
            })
            trigger.textContent = getDisplayText(selectedArr)
          })
          dropdown.appendChild(btn)
        })
      } else {
        var displayText = '—'
        opts.forEach(function (o) {
          var optVal = o.value || ''
          if (optVal === value) displayText = t ? (t(o.labelKey) || o.labelKey) : o.labelKey
          var btn = document.createElement('button')
          btn.type = 'button'
          btn.setAttribute('role', 'option')
          btn.className = 'drawer-profile-select-option' + (optVal === value ? ' is-active' : '')
          btn.setAttribute('data-value', optVal)
          btn.textContent = t ? (t(o.labelKey) || o.labelKey) : o.labelKey
          btn.addEventListener('click', function () {
            setOnboardingAnswer(name, optVal)
            trigger.textContent = btn.textContent
            dropdown.querySelectorAll('.drawer-profile-select-option').forEach(function (b) { b.classList.remove('is-active') })
            btn.classList.add('is-active')
            dropdown.hidden = true
            trigger.setAttribute('aria-expanded', 'false')
            if (config.optionsKey === 'contact' && typeof updateContactSubfield === 'function') updateContactSubfield(optVal)
          })
          dropdown.appendChild(btn)
        })
        trigger.textContent = displayText
      }

      function closeMe(e) {
        if (config.multiSelect && e && dropdown.contains(e.target)) return
        dropdown.hidden = true
        trigger.setAttribute('aria-expanded', 'false')
        document.removeEventListener('click', closeMe)
      }
      trigger.addEventListener('click', function () {
        var isOpen = !dropdown.hidden
        questionEl.querySelectorAll('.drawer-profile-select-dropdown').forEach(function (d) { d.hidden = true })
        questionEl.querySelectorAll('.drawer-profile-select-trigger').forEach(function (tr) { tr.setAttribute('aria-expanded', 'false') })
        if (!isOpen) {
          if (config.optionsKey === 'contact' && typeof updateContactSubfield === 'function') {
            updateContactSubfield(getOnboardingAnswers()[name] || '')
          }
          dropdown.hidden = false
          trigger.setAttribute('aria-expanded', 'true')
          setTimeout(function () { document.addEventListener('click', closeMe) }, 0)
        } else document.removeEventListener('click', closeMe)
      })
      wrap.appendChild(trigger)
      wrap.appendChild(dropdown)
      questionEl.appendChild(wrap)

      if (config.optionsKey === 'contact' && subWrap && subLabel && subInput && updateContactSubfield) {
        subWrap.appendChild(subLabel)
        subWrap.appendChild(subInput)
        questionEl.appendChild(subWrap)
        updateContactSubfield(value)
      }
      return
    }

    var input
    if (config.type === 'textarea') {
      input = document.createElement('textarea')
      input.rows = 3
      input.classList.add('drawer-profile-textarea')
    } else {
      input = document.createElement('input')
      input.type = config.type === 'email' ? 'email' : 'text'
    }
    input.id = 'drawer-onboarding-' + name
    input.name = name
    input.className = 'drawer-profile-input drawer-step-question-input'
    input.placeholder = placeholder
    input.value = value
    input.setAttribute('data-onboarding-q', name)
    input.addEventListener('input', function () { setOnboardingAnswer(name, input.value) })
    input.addEventListener('change', function () { setOnboardingAnswer(name, input.value) })
    questionEl.appendChild(input)
  }

  function isOpen() {
    return siteWrap.classList.contains('drawer-open')
  }
  function openDrawer() {
    siteWrap.classList.add('drawer-open')
    drawer.setAttribute('aria-hidden', 'false')
    btn.setAttribute('aria-expanded', 'true')
    var profileData = getFullProfileData()
    if (userDataContainer) userDataContainer.classList.remove('is-collapsed')
    if (userDataToggle) userDataToggle.setAttribute('aria-expanded', 'true')
    applyDrawerAccountExpanded(true)
    var user = typeof window.__prestixUser !== 'undefined' ? window.__prestixUser : null
    if (user && userDataProfile) {
      var name = (profileData && profileData.name) || user.name
      var email = (profileData && profileData.email) || user.email
      renderDrawerUserData({ name: name, email: email, image: user.image })
    } else if (typeof window.__prestixUpdateDrawerUserData === 'function') {
      window.__prestixUpdateDrawerUserData()
    }
    if (typeof window.__prestixRefreshAccountPageProfileOverview === 'function') window.__prestixRefreshAccountPageProfileOverview()
    syncDrawerEditMode()
    if (typeof window.__prestixSyncDrawerSettingsUI === 'function') window.__prestixSyncDrawerSettingsUI()
  }

  function syncDrawerSettingsUI() {
    var theme = typeof window.__prestixGetTheme === 'function' ? window.__prestixGetTheme() : 'dark'
    var darkRadio = document.getElementById('drawer-theme-dark')
    var lightRadio = document.getElementById('drawer-theme-light')
    if (darkRadio) darkRadio.checked = theme !== 'light'
    if (lightRadio) lightRadio.checked = theme === 'light'
    var lang = typeof window.__prestixGetLang === 'function' ? window.__prestixGetLang() : 'en'
    var langSelect = document.getElementById('drawer-language-select')
    if (langSelect) langSelect.value = lang
  }
  window.__prestixSyncDrawerSettingsUI = syncDrawerSettingsUI

  function patchUserSettings(payload) {
    fetch('/api/user/settings', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(function () {})
  }
  window.__prestixPatchUserSettings = patchUserSettings

  var drawerThemeDark = document.getElementById('drawer-theme-dark')
  var drawerThemeLight = document.getElementById('drawer-theme-light')
  var drawerLangSelect = document.getElementById('drawer-language-select')
  if (drawerThemeDark || drawerThemeLight) {
    function onDrawerThemeChange(e) {
      var val = e.target && e.target.value
      if (!val) return
      if (typeof window.__prestixSetTheme === 'function') window.__prestixSetTheme(val)
      if (typeof window.__prestixSyncSettingsUI === 'function') window.__prestixSyncSettingsUI()
      patchUserSettings({ theme: val })
    }
    if (drawerThemeDark) drawerThemeDark.addEventListener('change', onDrawerThemeChange)
    if (drawerThemeLight) drawerThemeLight.addEventListener('change', onDrawerThemeChange)
  }
  if (drawerLangSelect) {
    drawerLangSelect.addEventListener('change', function (e) {
      var val = e.target && e.target.value
      if (!val) return
      if (typeof window.__prestixSetLang === 'function') window.__prestixSetLang(val)
      if (typeof window.__prestixApplyTranslations === 'function') window.__prestixApplyTranslations()
      if (typeof window.__prestixSyncSettingsUI === 'function') window.__prestixSyncSettingsUI()
      patchUserSettings({ language: val })
    })
  }

  function renderDrawerUserData(user) {
    if (!userDataSignedOut) return
    var container = userDataContainer
    if (!user || typeof user !== 'object') {
      if (container) container.classList.remove('has-user')
      if (userDataProfile) userDataProfile.hidden = true
      userDataSignedOut.hidden = false
      if (drawerSignout) drawerSignout.hidden = true
      var drawerAdminBlock = document.getElementById('nav-drawer-user-data-admin')
      if (drawerAdminBlock) drawerAdminBlock.hidden = true
      return
    }
    userDataSignedOut.hidden = true
    if (container) container.classList.add('has-user')
    if (userDataProfile) userDataProfile.hidden = false
    if (userDataEmailEl) userDataEmailEl.textContent = user.email == null ? '' : String(user.email)
    if (userDataNameEl) userDataNameEl.textContent = user.name == null ? '' : String(user.name)
    if (userDataAvatarWrap) {
      userDataAvatarWrap.innerHTML = ''
      var imgUrl = user.image && typeof user.image === 'string' && user.image.indexOf('http') === 0 ? user.image : ''
      if (imgUrl) {
        var img = document.createElement('img')
        img.src = imgUrl
        img.alt = user.name || 'Profile'
        img.referrerPolicy = 'no-referrer'
        img.className = 'nav-drawer-user-data-avatar'
        userDataAvatarWrap.appendChild(img)
      } else {
        var placeholder = document.createElement('span')
        placeholder.className = 'nav-drawer-user-data-avatar-placeholder'
        placeholder.setAttribute('aria-hidden', 'true')
        placeholder.textContent = (user.name || user.email || '?').charAt(0).toUpperCase()
        userDataAvatarWrap.appendChild(placeholder)
      }
    }
    if (drawerSignout) {
      var pathname = (window.location.pathname || '/').replace(/\/+$/, '') || '/'
      var signoutUrl = window.location.origin + pathname
      drawerSignout.href = '/api/auth/signout?callbackUrl=' + encodeURIComponent(signoutUrl)
      drawerSignout.hidden = false
    }
    var drawerAdminBlock = document.getElementById('nav-drawer-user-data-admin')
    if (drawerAdminBlock) {
      drawerAdminBlock.hidden = true
    }
    if (typeof window.__prestixSyncAdminSection === 'function') {
      window.__prestixSyncAdminSection()
    }
  }

  window.__prestixUpdateDrawerUserData = function (userFromCache) {
    if (userFromCache !== undefined) {
      window.__prestixUser = userFromCache
      renderDrawerUserData(userFromCache)
      return
    }
    fetch('/api/auth/session', { credentials: 'include' })
      .then(function (res) { return res.json() })
      .then(function (data) {
        var u = data.user || null
        window.__prestixUser = u
        renderDrawerUserData(u)
      })
      .catch(function () {
        window.__prestixUser = null
        renderDrawerUserData(null)
      })
  }
  function closeDrawer() {
    if (drawer.contains(document.activeElement) && btn) {
      btn.focus()
    }
    siteWrap.classList.remove('drawer-open')
    drawer.setAttribute('aria-hidden', 'true')
    btn.setAttribute('aria-expanded', 'false')
  }

  function goToStep(step) {
    if (step < 1) step = 1
    if (step > DRAWER_STEPS) step = DRAWER_STEPS
    currentStep = step
    if (stepLabel) {
      var stepT = typeof window.__prestixT === 'function' && window.__prestixT('drawer.step_of')
      stepLabel.textContent = stepT ? String(stepT).replace('{n}', step) : 'Step ' + step + ' of ' + DRAWER_STEPS
    }
    if (progressBar) progressBar.style.width = (step / DRAWER_STEPS * 100) + '%'
    if (stepsContainer) {
      var steps = stepsContainer.querySelectorAll('.nav-drawer-step')
      steps.forEach(function (el, i) {
        var n = parseInt(el.getAttribute('data-step'), 10)
        el.classList.toggle('is-active', n === step)
      })
    }
    var t = typeof window.__prestixT === 'function' && window.__prestixT
    if (prevBtn) {
      prevBtn.disabled = false
      if (t) prevBtn.textContent = t('drawer.back') || 'Back'
    }
    if (nextBtn) {
      nextBtn.disabled = false
      var nextLabel = step >= DRAWER_STEPS ? (t ? t('drawer.save') : 'Save') : (t ? t('drawer.next') : 'Next')
      nextBtn.textContent = nextLabel
      nextBtn.setAttribute('aria-label', step >= DRAWER_STEPS ? (t ? t('profile.save') || 'Save profile' : 'Save profile') : (t ? t('drawer.next') || 'Next' : 'Next'))
    }
    if (step >= 2 && step <= 9) renderDrawerStepQuestion(step)
  }
  window.__prestixUpdateDrawerStepLabel = function () {
    goToStep(currentStep)
  }

  window.addEventListener('prestix:audience-change', function () {
    if (isOpen() && currentStep >= 2 && currentStep <= 9) renderDrawerStepQuestion(currentStep)
  })

  btn.addEventListener('click', function (e) {
    e.stopPropagation()
    if (isOpen()) closeDrawer(); else openDrawer()
  })
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer)
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) closeDrawer()
  })

  function getFullProfileData() {
    try {
      var raw = localStorage.getItem(ONBOARDING_STORAGE_KEY)
      var data = raw ? JSON.parse(raw) : {}
      var formData = typeof window.__prestixGetProfileFormData === 'function' ? window.__prestixGetProfileFormData() : {}
      data = Object.assign({}, data, formData)
      data.onboardingAnswers = getOnboardingAnswers()
      return data
    } catch (e) {
      return {}
    }
  }

  function formatAnswerValue(key, value, audience) {
    if (!value || !DRAWER_OPTIONS) return value
    var keys = ['interest_promoter', 'interest_partner', 'interest_marketplace', 'event_types', 'role_venue', 'how_heard', 'volume', 'contact', 'timeline', 'venue_type', 'market_city']
    var optsKey = key === 'q1' && audience ? ('interest_' + audience) : null
    if (!optsKey) {
      for (var i = 0; i < DRAWER_QUESTIONS.length; i++) {
        var c = DRAWER_QUESTIONS[i] && DRAWER_QUESTIONS[i][audience]
        if (c && c.name === key && c.optionsKey) { optsKey = c.optionsKey; break }
        if (c && c.name === key && c.multiSelect && c.optionsKey) { optsKey = c.optionsKey; break }
      }
    }
    if (!optsKey || !DRAWER_OPTIONS[optsKey]) return value
    var opts = DRAWER_OPTIONS[optsKey]
    var t = typeof window.__prestixT === 'function' && window.__prestixT
    var parts = (value || '').split(',').map(function (s) { return s.trim() }).filter(Boolean)
    return parts.map(function (v) {
      var o = opts.filter(function (x) { return (x.value || '') === v })[0]
      return o ? (t ? (t(o.labelKey) || o.labelKey) : o.labelKey) : v
    }).join(', ') || value
  }

  var PROFILE_FIELD_LABELS = {
    name: 'profile.name',
    email: 'profile.email',
    companyOrHandle: 'profile.company_or_handle',
    eventTypes: 'profile.event_types',
    volume: 'profile.volume',
    howHeard: 'profile.how_heard',
    comments: 'profile.comments',
    venueName: 'profile.venue_name',
    roleAtVenue: 'profile.role_at_venue',
    market: 'profile.market'
  }
  var PROFILE_FIELD_OPTIONS = { eventTypes: 'event_types', volume: 'volume', howHeard: 'how_heard', roleAtVenue: 'role_venue', market: 'market_city' }

  function formatProfileFieldValue(key, value, audience) {
    var optsKey = PROFILE_FIELD_OPTIONS[key]
    if (!optsKey || !DRAWER_OPTIONS[optsKey]) return value
    var opts = DRAWER_OPTIONS[optsKey]
    var t = typeof window.__prestixT === 'function' && window.__prestixT
    var parts = (value || '').split(',').map(function (s) { return s.trim() }).filter(Boolean)
    return parts.map(function (v) {
      var o = opts.filter(function (x) { return (x.value || '') === v })[0]
      return o ? (t ? (t(o.labelKey) || o.labelKey) : o.labelKey) : v
    }).join(', ') || value
  }

  function getProfileOverviewEntries(profileData) {
    var entries = []
    var audience = (profileData && profileData.profileType) || (typeof window.__prestixGetAudience === 'function' ? window.__prestixGetAudience() : null) || 'promoter'
    var t = typeof window.__prestixT === 'function' && window.__prestixT
    var fieldsOrder = audience === 'promoter' ? ['name', 'email', 'companyOrHandle', 'eventTypes', 'volume', 'howHeard', 'comments'] : audience === 'partner' ? ['name', 'email', 'venueName', 'roleAtVenue', 'market', 'howHeard', 'comments'] : ['name', 'howHeard', 'comments']
    fieldsOrder.forEach(function (key) {
      var val = profileData && profileData[key]
      if (val == null || String(val).trim() === '') return
      var labelKey = PROFILE_FIELD_LABELS[key]
      var label = labelKey && t ? (t(labelKey) || labelKey) : key
      var displayVal = PROFILE_FIELD_OPTIONS[key] ? formatProfileFieldValue(key, val, audience) : val
      entries.push({ label: label, value: displayVal })
    })
    var answers = profileData && profileData.onboardingAnswers ? profileData.onboardingAnswers : {}
    var stepLabels = {}
    DRAWER_QUESTIONS.forEach(function (row) {
      var config = row && row[audience]
      if (config && config.titleKey) stepLabels[config.name] = t ? (t(config.titleKey) || config.titleKey) : config.titleKey
    })
    Object.keys(answers).sort().forEach(function (key) {
      var val = answers[key]
      if (val == null || String(val).trim() === '') return
      var label = stepLabels[key] || key
      var displayVal = formatAnswerValue(key, val, audience)
      entries.push({ label: label, value: displayVal })
    })
    return entries
  }

  function saveProfileAndCollapse() {
    var data = getFullProfileData()
    data.savedAt = new Date().toISOString()
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data))
    } catch (e) {}
    if (nextBtn) nextBtn.disabled = true
    fetch('/api/profile', { method: 'GET', credentials: 'include' })
      .then(function (r) { return r.json() })
      .then(function (getRes) {
        if (getRes && getRes.canUpload) {
          return fetch('/api/profile', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          }).then(function (r) { return r.json().then(function (body) { return { status: r.status, body: body } }) })
        }
        return { status: 200, body: { saved: false } }
      })
      .then(function (result) {
        var t = typeof window.__prestixT === 'function' && window.__prestixT
        var msg = result.body && result.body.saved
          ? (t ? (t('profile.saved_uploaded') || 'Profile saved and sent to the team.') : 'Profile saved and sent to the team.')
          : (t ? (t('profile.saved_local') || 'Profile saved locally.') : 'Profile saved locally.')
        if (typeof window.__prestixToast === 'function') window.__prestixToast(msg, 'success')
      })
      .catch(function () {
        var t = typeof window.__prestixT === 'function' && window.__prestixT
        var msg = t ? (t('profile.saved_local') || 'Profile saved locally.') : 'Profile saved locally.'
        if (typeof window.__prestixToast === 'function') window.__prestixToast(msg, 'success')
      })
      .then(function () {
        if (nextBtn) nextBtn.disabled = false
        collapseToOverview(data)
      })
  }

  window.__prestixCollapseDrawerToOverview = function () {
    var data = getFullProfileData()
    data.savedAt = new Date().toISOString()
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data))
    } catch (e) {}
    collapseToOverview(data)
  }

  function collapseToOverview(data) {
    if (accountPageStepsWrap) accountPageStepsWrap.hidden = true
    syncDrawerEditMode()
    if (userDataContainer) userDataContainer.classList.remove('is-collapsed')
    if (userDataToggle) userDataToggle.setAttribute('aria-expanded', 'true')
    applyDrawerAccountExpanded(true)
    try { sessionStorage.setItem(DRAWER_ACCOUNT_EXPANDED_KEY, 'true') } catch (e) {}
    var user = typeof window.__prestixUser !== 'undefined' ? window.__prestixUser : null
    if (user && userDataProfile) {
      var name = (data && data.name) || user.name
      var email = (data && data.email) || user.email
      var image = user.image
      renderDrawerUserData({ name: name, email: email, image: image })
    }
    if (typeof window.__prestixRefreshAccountPageProfileOverview === 'function') window.__prestixRefreshAccountPageProfileOverview()
  }

  window.__prestixGetProfileData = getFullProfileData
  window.__prestixGetProfileOverviewEntries = getProfileOverviewEntries

  window.__prestixOpenDrawerInEditMode = function () {
    if (!accountPageStepsWrap) return
    if (isOpen()) closeDrawer()
    var pathname = (window.location.pathname || '/').replace(/\/$/, '') || ''
    if (pathname !== '/account' && pathname.indexOf('/account') !== 0) {
      if (typeof window.__prestixNavigateTo === 'function') {
        window.__prestixNavigateTo('account')
      } else {
        try { window.location.href = '/account' } catch (e) {}
      }
    }
    accountPageStepsWrap.hidden = false
    if (accountPageProfileOverviewEl) accountPageProfileOverviewEl.hidden = true
    goToStep(1)
    if (typeof window.__prestixRefreshProfileQuestionnaire === 'function') {
      window.__prestixRefreshProfileQuestionnaire()
    }
    syncDrawerEditMode()
  }

  function collapseToProfileOverview() {
    var data = getFullProfileData()
    if (accountPageStepsWrap) accountPageStepsWrap.hidden = true
    syncDrawerEditMode()
    if (userDataContainer) userDataContainer.classList.remove('is-collapsed')
    if (userDataToggle) userDataToggle.setAttribute('aria-expanded', 'true')
    applyDrawerAccountExpanded(true)
    try { sessionStorage.setItem(DRAWER_ACCOUNT_EXPANDED_KEY, 'true') } catch (e) {}
    var user = typeof window.__prestixUser !== 'undefined' ? window.__prestixUser : null
    if (user && userDataProfile) {
      var name = (data && data.name) || user.name
      var email = (data && data.email) || user.email
      var image = user.image
      renderDrawerUserData({ name: name, email: email, image: image })
    }
    if (typeof window.__prestixRefreshAccountPageProfileOverview === 'function') window.__prestixRefreshAccountPageProfileOverview()
  }

  if (prevBtn) prevBtn.addEventListener('click', function () {
    if (currentStep <= 1) {
      collapseToProfileOverview()
      return
    }
    goToStep(currentStep - 1)
  })
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (currentStep >= DRAWER_STEPS) {
        saveProfileAndCollapse()
        return
      }
      goToStep(currentStep + 1)
    })
  }
})()

/* Route provider: /account, /settings, /pitch, /users (path-based) or hash fallback, or landing */
;(function () {
  var landingView = document.getElementById('landing-view')
  var pitchView = document.getElementById('pitch-view')
  var pitchFrame = document.getElementById('pitch-frame')
  var accountView = document.getElementById('account-view')
  var settingsView = document.getElementById('settings-view')
  var usersView = document.getElementById('users-view')
  var siteWrap = document.getElementById('site-wrap')
  var accountMenuBtn = document.getElementById('account-menu-btn')

  if (!landingView || !accountView) return

  function getCurrentRoute() {
    var pathname = (window.location.pathname || '/').replace(/\/$/, '') || ''
    if (pathname === '/account' || pathname.indexOf('/account') === 0) {
      var sub = (window.location.hash || '').replace(/^#/, '')
      return { path: 'account', search: window.location.search, sub: sub }
    }
    if (pathname === '/settings') {
      return { path: 'settings', search: window.location.search, sub: '' }
    }
    if (pathname === '/users') {
      return { path: 'users', search: window.location.search, sub: '' }
    }
    if (pathname === '/pitch' || pathname.indexOf('/pitch') === 0) {
      return { path: 'pitch', search: window.location.search, sub: '' }
    }
    var hashParts = (window.location.hash || '').split('?')
    var hashPath = (hashParts[0] || '').replace(/^#\/?/, '') || 'landing'
    var hashQuery = hashParts[1] || ''
    var path = (hashPath === 'account' || hashPath.indexOf('account') === 0) ? 'account' : (hashPath === 'settings') ? 'settings' : (hashPath === 'users') ? 'users' : (hashPath === 'pitch' || hashPath.indexOf('pitch') === 0) ? 'pitch' : 'landing'
    var search = hashQuery ? '?' + hashQuery : ''
    var sub = path === 'account' ? (hashPath.replace('account', '').replace(/^#\/?/, '')) : ''
    return { path: path, search: search, sub: sub }
  }

  function navigateTo(path, search) {
    var base = window.location.origin + (window.location.pathname || '/').replace(/\/[^/]*$/, '') || window.location.origin
    if (base.endsWith('/')) base = base.slice(0, -1)
    var url = path === 'landing' ? base + '/' : base + '/' + path + (search || '')
    try {
      window.history.pushState(null, '', url)
      applyRoute()
    } catch (e) {}
  }

  function redirectToSignInForUsers() {
    var callbackUrl = (window.location.origin || '') + '/users'
    window.location.href = '/api/auth/signin?callbackUrl=' + encodeURIComponent(callbackUrl)
  }

  function redirectToLanding() {
    window.location.href = (window.location.origin || '') + '/'
  }

  var usersManagementState = { allUsers: [], page: 1, perPage: 100, searchQuery: '' }

  function filterUsersBySearch(users, query) {
    if (!query || typeof query !== 'string') return users
    var q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(function (u) {
      var email = (u.email || '').toLowerCase()
      var name = (u.name || '').toLowerCase()
      var id = (u.id || '').toLowerCase()
      return email.indexOf(q) !== -1 || name.indexOf(q) !== -1 || id.indexOf(q) !== -1
    })
  }

  function renderUsersTableRows(tableBody, users, startIndex) {
    if (!tableBody) return
    tableBody.innerHTML = ''
    users.forEach(function (u) {
      var tr = document.createElement('tr')
      var tdEmail = document.createElement('td')
      tdEmail.textContent = u.email || '—'
      var tdName = document.createElement('td')
      tdName.textContent = u.name || '—'
      var tdLast = document.createElement('td')
      tdLast.textContent = u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString() : '—'
      var tdAdmin = document.createElement('td')
      var label = document.createElement('label')
      label.className = 'users-admin-toggle'
      var input = document.createElement('input')
      input.type = 'checkbox'
      input.checked = !!u.isAdmin
      input.setAttribute('aria-label', 'Admin for ' + (u.email || u.id))
      input.dataset.userId = u.id
      input.addEventListener('change', function () {
        var userId = this.dataset.userId
        var isAdmin = this.checked
        fetch('/api/admin/users', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId, isAdmin: isAdmin }),
        })
          .then(function (res) {
            if (!res.ok) throw new Error('Update failed')
          })
          .catch(function () {
            if (typeof window.__prestixToast === 'function') window.__prestixToast('Update failed', 'error')
            input.checked = !isAdmin
          })
      })
      label.appendChild(input)
      tdAdmin.appendChild(label)
      var tdActive = document.createElement('td')
      var activeLabel = document.createElement('label')
      activeLabel.className = 'users-active-toggle'
      var activeInput = document.createElement('input')
      activeInput.type = 'checkbox'
      activeInput.checked = u.active !== false
      activeInput.setAttribute('aria-label', 'Active for ' + (u.email || u.id))
      activeInput.dataset.userId = u.id
      var isProfileOnly = String(u.id).indexOf('profile-') === 0
      if (isProfileOnly) activeInput.disabled = true
      activeInput.addEventListener('change', function () {
        if (isProfileOnly) return
        var userId = this.dataset.userId
        var active = this.checked
        var cb = this
        fetch('/api/admin/users', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId, active: active }),
        })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d } }) })
          .then(function (result) {
            if (!result.ok) {
              if (typeof window.__prestixToast === 'function') window.__prestixToast(result.data.error || 'Update failed', 'error')
              cb.checked = !active
            }
          })
          .catch(function () {
            if (typeof window.__prestixToast === 'function') window.__prestixToast('Request failed', 'error')
            cb.checked = !active
          })
      })
      activeLabel.appendChild(activeInput)
      tdActive.appendChild(activeLabel)
      var tdPassword = document.createElement('td')
      var setPwBtn = document.createElement('button')
      setPwBtn.type = 'button'
      setPwBtn.className = 'btn btn-secondary users-set-password-btn'
      setPwBtn.textContent = 'Set password'
      setPwBtn.dataset.email = u.email || ''
      setPwBtn.addEventListener('click', function () {
        var email = this.dataset.email
        if (!email) return
        var raw = window.prompt('Enter new password (min 8 characters). User will be able to sign in with email + this password.')
        if (raw == null) return
        if (raw.length < 8) {
          if (typeof window.__prestixToast === 'function') window.__prestixToast('Password must be at least 8 characters', 'error')
          return
        }
        this.disabled = true
        fetch('/api/admin/set-password', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, newPassword: raw }),
        })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d } }) })
          .then(function (result) {
            setPwBtn.disabled = false
            if (result.ok) {
              if (typeof window.__prestixToast === 'function') window.__prestixToast(result.data.message || 'Password set.', 'success')
            } else {
              if (typeof window.__prestixToast === 'function') window.__prestixToast(result.data.error || 'Failed', 'error')
            }
          })
          .catch(function () {
            setPwBtn.disabled = false
            if (typeof window.__prestixToast === 'function') window.__prestixToast('Request failed', 'error')
          })
      })
      tdPassword.appendChild(setPwBtn)
      tr.appendChild(tdEmail)
      tr.appendChild(tdName)
      tr.appendChild(tdLast)
      tr.appendChild(tdAdmin)
      tr.appendChild(tdActive)
      tr.appendChild(tdPassword)
      tableBody.appendChild(tr)
    })
  }

  function setUsersTableWrapMaxHeight() {
    var tableWrap = document.getElementById('users-table-wrap')
    if (!tableWrap || tableWrap.hidden) return
    var rect = tableWrap.getBoundingClientRect()
    var topOffset = rect.top
    var maxHeight = window.innerHeight - topOffset
    if (maxHeight < 100) maxHeight = 100
    tableWrap.style.maxHeight = maxHeight + 'px'
  }

  function renderUsersPagination() {
    var state = usersManagementState
    var filtered = filterUsersBySearch(state.allUsers, state.searchQuery)
    var totalFiltered = filtered.length
    var perPage = Math.max(1, parseInt(state.perPage, 10) || 100)
    var totalPages = Math.max(1, Math.ceil(totalFiltered / perPage))
    var page = Math.max(1, Math.min(state.page, totalPages))
    state.page = page
    var start = (page - 1) * perPage
    var pageUsers = filtered.slice(start, start + perPage)

    var tableBody = document.getElementById('users-table-body')
    var toolbar = document.getElementById('users-toolbar')
    var tableWrap = document.getElementById('users-table-wrap')
    var pageInfo = document.getElementById('users-page-info')
    var prevBtn = document.getElementById('users-prev-btn')
    var nextBtn = document.getElementById('users-next-btn')
    var perPageSelect = document.getElementById('users-per-page')

    renderUsersTableRows(tableBody, pageUsers, start)
    if (toolbar) toolbar.hidden = false
    if (tableWrap) tableWrap.hidden = false

    if (pageInfo) {
      var from = totalFiltered === 0 ? 0 : start + 1
      var to = Math.min(start + perPage, totalFiltered)
      pageInfo.textContent = from + '–' + to + ' of ' + totalFiltered + (state.searchQuery ? ' (filtered)' : '')
    }
    if (prevBtn) {
      prevBtn.disabled = page <= 1
    }
    if (nextBtn) {
      nextBtn.disabled = page >= totalPages
    }
    if (perPageSelect) {
      perPageSelect.value = String(perPage)
    }
    requestAnimationFrame(function () {
      setUsersTableWrapMaxHeight()
    })
  }

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('resize', function () {
      setUsersTableWrapMaxHeight()
    })
  }

  function loadUsersManagement() {
    var wrap = document.getElementById('users-management-wrap')
    var loading = document.getElementById('users-loading')
    var tableWrap = document.getElementById('users-table-wrap')
    var tableBody = document.getElementById('users-table-body')
    var errEl = document.getElementById('users-error')
    var toolbar = document.getElementById('users-toolbar')
    if (!wrap || !tableBody) return
    loading.hidden = false
    if (toolbar) toolbar.hidden = true
    if (tableWrap) tableWrap.hidden = true
    if (errEl) { errEl.hidden = true; errEl.textContent = '' }
    fetch('/api/auth/session', { credentials: 'include' })
      .then(function (r) { return r.json() })
      .then(function (sessionData) {
        var user = sessionData && sessionData.user
        if (!user || !user.id) {
          redirectToSignInForUsers()
          return
        }
        return fetch('/api/admin/users', { credentials: 'include' })
      })
      .then(function (r) {
        if (!r) return
        if (r.status === 403) {
          redirectToLanding()
          return
        }
        if (!r.ok) throw new Error('Failed to load')
        return r.json()
      })
      .then(function (data) {
        if (!data) return
        loading.hidden = true
        var users = (data && data.users) || []
        usersManagementState.allUsers = users
        usersManagementState.page = 1
        usersManagementState.perPage = 100
        usersManagementState.searchQuery = (document.getElementById('users-search-input') && document.getElementById('users-search-input').value) || ''
        renderUsersPagination()

        var searchInput = document.getElementById('users-search-input')
        var perPageSelect = document.getElementById('users-per-page')
        var prevBtn = document.getElementById('users-prev-btn')
        var nextBtn = document.getElementById('users-next-btn')
        if (searchInput && !searchInput._usersWired) {
          searchInput._usersWired = true
          searchInput.addEventListener('input', function () {
            usersManagementState.searchQuery = this.value
            usersManagementState.page = 1
            renderUsersPagination()
          })
        }
        if (perPageSelect && !perPageSelect._usersWired) {
          perPageSelect._usersWired = true
          perPageSelect.addEventListener('change', function () {
            usersManagementState.perPage = Math.max(1, parseInt(this.value, 10) || 100)
            usersManagementState.page = 1
            renderUsersPagination()
          })
        }
        if (prevBtn && !prevBtn._usersWired) {
          prevBtn._usersWired = true
          prevBtn.addEventListener('click', function () {
            if (usersManagementState.page > 1) {
              usersManagementState.page--
              renderUsersPagination()
            }
          })
        }
        if (nextBtn && !nextBtn._usersWired) {
          nextBtn._usersWired = true
          nextBtn.addEventListener('click', function () {
            var filtered = filterUsersBySearch(usersManagementState.allUsers, usersManagementState.searchQuery)
            var totalPages = Math.max(1, Math.ceil(filtered.length / usersManagementState.perPage))
            if (usersManagementState.page < totalPages) {
              usersManagementState.page++
              renderUsersPagination()
            }
          })
        }
      })
      .catch(function (err) {
        loading.hidden = true
        if (err && err.message === 'Forbidden') {
          redirectToLanding()
          return
        }
        if (errEl) {
          errEl.textContent = (err && err.message) || 'Failed to load users'
          errEl.hidden = false
        }
      })
  }

  window.__prestixNavigateTo = navigateTo

  var breadcrumbHomeLink = document.getElementById('header-breadcrumb-home')
  if (breadcrumbHomeLink) {
    breadcrumbHomeLink.addEventListener('click', function (e) {
      if (window.__prestixNavigateTo && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
        e.preventDefault()
        navigateTo('landing', '')
      }
    })
  }

  function closeDrawerIfOpen() {
    if (siteWrap && siteWrap.classList.contains('drawer-open')) {
      var drawer = document.getElementById('nav-drawer')
      if (drawer && drawer.contains(document.activeElement) && accountMenuBtn) {
        accountMenuBtn.focus()
      }
      siteWrap.classList.remove('drawer-open')
      if (drawer) drawer.setAttribute('aria-hidden', 'true')
      if (accountMenuBtn) accountMenuBtn.setAttribute('aria-expanded', 'false')
    }
  }

  function translatedOr(key, fallback) {
    var t = typeof window.__prestixT === 'function' ? window.__prestixT : function (k) { return k }
    var v = t(key)
    return (v !== undefined && v !== key ? v : null) || fallback
  }

  function updateBreadcrumb(route) {
    var breadcrumb = document.getElementById('header-breadcrumb')
    var currentEl = document.getElementById('header-breadcrumb-current')
    if (!breadcrumb || !currentEl) return
    var onAccount = route === 'account' || route.indexOf('account') === 0
    var onSettings = route === 'settings' || route.indexOf('settings') === 0
    var onPitch = route === 'pitch' || route.indexOf('pitch') === 0
    var onUsers = route === 'users' || route.indexOf('users') === 0
    if (onAccount || onSettings || onPitch || onUsers) {
      currentEl.textContent = onSettings ? translatedOr('settings.title', 'Settings') : onPitch ? translatedOr('drawer.pitch', 'Investor Pitch') : onUsers ? translatedOr('users.title', 'User management') : translatedOr('nav.section_account', 'Account')
      breadcrumb.hidden = false
    } else {
      breadcrumb.hidden = true
    }
  }

  var BASE_TITLE = 'PRESTIX.VIP'
  function updateDocumentTitle(routePath) {
    var title
    if (routePath === 'account' || routePath.indexOf('account') === 0) {
      title = translatedOr('nav.section_account', 'Account') + ' — ' + BASE_TITLE
    } else if (routePath === 'settings') {
      title = translatedOr('settings.title', 'Settings') + ' — ' + BASE_TITLE
    } else if (routePath === 'users') {
      title = translatedOr('users.title', 'User management') + ' — ' + BASE_TITLE
    } else if (routePath === 'pitch' || routePath.indexOf('pitch') === 0) {
      title = translatedOr('drawer.pitch', 'Investor Pitch') + ' — ' + BASE_TITLE
    } else {
      title = 'Promote & Earn — ' + BASE_TITLE
    }
    try { document.title = title } catch (e) {}
  }

  function applyRoute() {
    var route = getCurrentRoute()
    var onAccount = route.path === 'account'
    var onSettings = route.path === 'settings'
    var onPitch = route.path === 'pitch'
    var onUsers = route.path === 'users'

    if (onSettings) {
      closeDrawerIfOpen()
      landingView.hidden = true
      if (pitchView) pitchView.hidden = true
      accountView.hidden = true
      if (usersView) usersView.hidden = true
      if (settingsView) settingsView.hidden = false
      if (typeof window.__prestixSyncSettingsUI === 'function') window.__prestixSyncSettingsUI()
      if (typeof window.__prestixSyncAdminSection === 'function') window.__prestixSyncAdminSection()
    } else if (onUsers && usersView) {
      closeDrawerIfOpen()
      landingView.hidden = true
      if (pitchView) pitchView.hidden = true
      accountView.hidden = true
      if (settingsView) settingsView.hidden = true
      usersView.hidden = false
      if (typeof window.__prestixLoadUsersManagement === 'function') window.__prestixLoadUsersManagement()
      if (typeof window.__prestixSyncAdminSection === 'function') window.__prestixSyncAdminSection()
    } else if (onAccount) {
      closeDrawerIfOpen()
      landingView.hidden = true
      if (pitchView) pitchView.hidden = true
      accountView.hidden = false
      if (settingsView) settingsView.hidden = true
      if (usersView) usersView.hidden = true
      var resetWrap = document.getElementById('account-reset-password-wrap')
      var accountMain = document.getElementById('account-page-main')
      var search = window.location.search || ''
      var resetMatch = search.match(/[?&]reset=([^&]+)/)
      var resetToken = resetMatch ? decodeURIComponent(resetMatch[1]) : ''
      if (resetWrap && accountMain) {
        if (resetToken) {
          resetWrap.hidden = false
          accountMain.hidden = true
          resetWrap.dataset.resetToken = resetToken
        } else {
          resetWrap.hidden = true
          accountMain.hidden = false
        }
      }
      if (typeof window.__prestixCheckSession === 'function') {
        window.__prestixCheckSession()
      }
      if (typeof window.__prestixSyncAdminSection === 'function') window.__prestixSyncAdminSection()
      if (route.sub === 'preferences' || route.sub === 'notifications') {
        var el = document.getElementById('account-' + route.sub)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } else if (onPitch && pitchView && pitchFrame) {
      closeDrawerIfOpen()
      landingView.hidden = true
      accountView.hidden = true
      if (settingsView) settingsView.hidden = true
      if (usersView) usersView.hidden = true
      pitchView.hidden = false
      var slideParam = route.search || ''
      if (slideParam.indexOf('slide=') === -1) slideParam = '?slide=1'
      pitchFrame.src = '/pitch-embed.html' + slideParam
    } else {
      landingView.hidden = false
      if (pitchView) pitchView.hidden = true
      accountView.hidden = true
      if (settingsView) settingsView.hidden = true
      if (usersView) usersView.hidden = true
    }
    updateBreadcrumb(route.path)
    updateDocumentTitle(route.path)
  }

  function runRoute() {
    applyRoute()
  }
  window.__prestixLoadUsersManagement = loadUsersManagement
  window.__prestixUpdateBreadcrumb = function () {
    updateBreadcrumb(getCurrentRoute().path)
    updateDocumentTitle(getCurrentRoute().path)
  }

  var drawerUsersLink = document.getElementById('nav-drawer-users-link')
  if (drawerUsersLink) {
    drawerUsersLink.addEventListener('click', function (e) {
      if (window.__prestixNavigateTo && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
        e.preventDefault()
        navigateTo('users', '')
      }
    })
  }
  var accountUsersLink = document.getElementById('account-users-link')
  if (accountUsersLink) {
    accountUsersLink.addEventListener('click', function (e) {
      if (window.__prestixNavigateTo && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
        e.preventDefault()
        navigateTo('users', '')
      }
    })
  }

  var accountResetForm = document.getElementById('account-reset-password-form')
  var accountResetWrap = document.getElementById('account-reset-password-wrap')
  var accountResetError = document.getElementById('account-reset-password-error')
  var accountResetNewPw = document.getElementById('account-reset-new-password')
  var accountResetConfirmPw = document.getElementById('account-reset-confirm-password')
  if (accountResetForm && accountResetWrap && accountResetError) {
    accountResetForm.addEventListener('submit', function (e) {
      e.preventDefault()
      var token = accountResetWrap.dataset.resetToken
      var newPw = accountResetNewPw ? accountResetNewPw.value : ''
      var confirmPw = accountResetConfirmPw ? accountResetConfirmPw.value : ''
      if (!token) {
        accountResetError.textContent = 'Reset link is invalid or expired.'
        accountResetError.hidden = false
        return
      }
      if (newPw.length < 8) {
        accountResetError.textContent = 'Password must be at least 8 characters.'
        accountResetError.hidden = false
        return
      }
      if (newPw !== confirmPw) {
        accountResetError.textContent = 'Passwords do not match.'
        accountResetError.hidden = false
        return
      }
      accountResetError.hidden = true
      var submitBtn = accountResetForm.querySelector('button[type="submit"]')
      if (submitBtn) submitBtn.disabled = true
      fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: token, newPassword: newPw }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d } }) })
        .then(function (result) {
          if (submitBtn) submitBtn.disabled = false
          if (result.ok) {
            accountResetError.textContent = result.data.message || 'Password set. You can now sign in.'
            accountResetError.hidden = false
            accountResetError.style.color = ''
            if (accountResetNewPw) accountResetNewPw.value = ''
            if (accountResetConfirmPw) accountResetConfirmPw.value = ''
            delete accountResetWrap.dataset.resetToken
            var cleanUrl = window.location.pathname || '/account'
            if (window.history && window.history.replaceState) {
              window.history.replaceState(null, '', cleanUrl)
            }
            setTimeout(function () {
              accountResetWrap.hidden = true
              var main = document.getElementById('account-page-main')
              if (main) main.hidden = false
              accountResetError.hidden = true
            }, 3000)
          } else {
            accountResetError.textContent = result.data.error || 'Failed to set password.'
            accountResetError.hidden = false
          }
        })
        .catch(function () {
          if (submitBtn) submitBtn.disabled = false
          accountResetError.textContent = 'Request failed. Try again.'
          accountResetError.hidden = false
        })
    })
  }

  window.addEventListener('hashchange', runRoute)
  window.addEventListener('popstate', runRoute)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runRoute)
  } else {
    runRoute()
  }
})()

/* Admin section: show only after GET /api/profile confirms canDownloadUsers / canManageUsers for current user */
;(function () {
  var settingsAdmin = document.getElementById('settings-admin')
  var accountAdmin = document.getElementById('account-admin')
  var drawerUsersWrap = document.getElementById('nav-drawer-users-wrap')
  var drawerAdminBlock = document.getElementById('nav-drawer-user-data-admin')
  var settingsDownloadBtn = document.getElementById('settings-download-users-btn')
  var accountDownloadBtn = document.getElementById('account-download-users-btn')
  var settingsFeedbackBtn = document.getElementById('settings-download-feedback-btn')
  var accountFeedbackBtn = document.getElementById('account-download-feedback-btn')

  function setAllAdminHidden(hidden) {
    if (settingsAdmin) settingsAdmin.hidden = hidden
    if (accountAdmin) accountAdmin.hidden = hidden
    if (drawerUsersWrap) drawerUsersWrap.hidden = hidden
    if (drawerAdminBlock) drawerAdminBlock.hidden = hidden
  }

  function syncAdminSectionVisibility() {
    var anyAdminEl = settingsAdmin || accountAdmin || drawerUsersWrap || drawerAdminBlock
    if (!anyAdminEl) return
    setAllAdminHidden(true)
    fetch('/api/profile', { method: 'GET', credentials: 'include' })
      .then(function (r) { return r.json() })
      .then(function (data) {
        // Only show admin UI when the API explicitly says the current user is admin (strict check).
        var show = data && data.canDownloadUsers === true
        var showManage = data && data.canManageUsers === true
        if (settingsAdmin) settingsAdmin.hidden = !show
        if (accountAdmin) accountAdmin.hidden = !show
        if (drawerUsersWrap) drawerUsersWrap.hidden = !showManage
        if (drawerAdminBlock) drawerAdminBlock.hidden = !show
      })
      .catch(function () {
        setAllAdminHidden(true)
      })
  }

  function handleDownloadClick(e) {
    e.preventDefault()
    fetch('/api/admin/export', { credentials: 'include' })
      .then(function (r) {
        if (!r.ok) throw new Error('Forbidden')
        return r.blob()
      })
      .then(function (blob) {
        var url = URL.createObjectURL(blob)
        var a = document.createElement('a')
        a.href = url
        a.download = 'prestix-users-' + new Date().toISOString().slice(0, 10) + '.xlsx'
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch(function () {
        if (typeof window.__prestixToast === 'function') {
          window.__prestixToast('Download failed.', 'error')
        }
      })
  }

  function handleFeedbackDownloadClick(e) {
    e.preventDefault()
    fetch('/api/admin/export-feedback', { credentials: 'include' })
      .then(function (r) {
        if (!r.ok) throw new Error('Forbidden')
        return r.blob()
      })
      .then(function (blob) {
        var url = URL.createObjectURL(blob)
        var a = document.createElement('a')
        a.href = url
        a.download = 'prestix-question-data-' + new Date().toISOString().slice(0, 10) + '.xlsx'
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch(function () {
        if (typeof window.__prestixToast === 'function') {
          window.__prestixToast('Download failed.', 'error')
        }
      })
  }

  var drawerDownloadUsersBtn = document.getElementById('nav-drawer-download-users-btn')
  var drawerDownloadFeedbackBtn = document.getElementById('nav-drawer-download-feedback-btn')

  if (settingsDownloadBtn) settingsDownloadBtn.addEventListener('click', handleDownloadClick)
  if (accountDownloadBtn) accountDownloadBtn.addEventListener('click', handleDownloadClick)
  if (settingsFeedbackBtn) settingsFeedbackBtn.addEventListener('click', handleFeedbackDownloadClick)
  if (accountFeedbackBtn) accountFeedbackBtn.addEventListener('click', handleFeedbackDownloadClick)
  if (drawerDownloadUsersBtn) drawerDownloadUsersBtn.addEventListener('click', handleDownloadClick)
  if (drawerDownloadFeedbackBtn) drawerDownloadFeedbackBtn.addEventListener('click', handleFeedbackDownloadClick)

  window.__prestixSyncAdminSection = syncAdminSectionVisibility
})()

/* Account: session (Sign in with Google), update UI and signin link */
;(function () {
  var signinActions = document.getElementById('account-signin-actions')
  var signedInBlock = document.getElementById('account-signed-in')
  var signinGoogleBtn = document.getElementById('account-signin-google-btn')
  var signoutBtn = document.getElementById('account-signout-btn')
  var userImage = document.getElementById('account-user-image')
  var userImagePlaceholder = document.getElementById('account-user-image-placeholder')
  var userName = document.getElementById('account-user-name')
  var userEmail = document.getElementById('account-user-email')
  var authError = document.getElementById('account-auth-error')
  var headerAvatar = document.getElementById('header-avatar')
  var headerAvatarPlaceholder = document.getElementById('header-avatar-placeholder')

  function updateHeaderAvatar(user) {
    if (!headerAvatar || !headerAvatarPlaceholder) return
    if (user && user.image && typeof user.image === 'string' && user.image.indexOf('http') === 0) {
      headerAvatar.src = user.image
      headerAvatar.alt = user.name || 'Profile'
      headerAvatar.hidden = false
      headerAvatarPlaceholder.hidden = true
    } else {
      headerAvatar.removeAttribute('src')
      headerAvatar.alt = ''
      headerAvatar.hidden = true
      headerAvatarPlaceholder.hidden = false
    }
  }

  function getCallbackUrl() {
    var base = window.location.origin + (window.location.pathname || '/')
    return base.replace(/\/?$/, '') + '/account'
  }

  function updateSigninLink() {
    if (signinGoogleBtn) {
      signinGoogleBtn.href = '/api/auth/signin?callbackUrl=' + encodeURIComponent(getCallbackUrl())
    }
  }

  function showAuthError(msg) {
    if (!authError) return
    authError.textContent = msg || ''
    authError.hidden = !msg
  }

  function clearAuthErrorFromUrl() {
    var pathname = window.location.pathname || '/'
    var onPathRoute = pathname === '/account' || pathname === '/settings' || pathname.indexOf('/account') === 0
    if (onPathRoute) {
      var params = new URLSearchParams(window.location.search)
      if (!params.has('error')) return
      params.delete('error')
      var qs = params.toString()
      var newUrl = pathname + (qs ? '?' + qs : '') + (window.location.hash || '')
      try { window.history.replaceState(null, '', newUrl) } catch (e) {}
      return
    }
    var hash = window.location.hash || ''
    var parts = hash.split('?')
    var path = parts[0] || ''
    var params = new URLSearchParams(parts[1] || '')
    if (!params.has('error')) return
    params.delete('error')
    var qs = params.toString()
    var newHash = qs ? path + '?' + qs : path
    if (newHash !== hash) {
      try { window.history.replaceState(null, '', window.location.pathname + window.location.search + newHash) } catch (e) {}
    }
  }

  var accountPageUserDataList = document.getElementById('account-page-user-data-list')
  var accountPageProfileOverview = document.getElementById('account-page-profile-overview')
  var accountPageProfileOverviewList = document.getElementById('account-page-profile-overview-list')
  var accountPageProfileOverviewToggle = document.getElementById('account-page-profile-overview-toggle')
  var accountPageProfileOverviewContent = document.getElementById('account-page-profile-overview-content')
  var ACCOUNT_USER_KEYS = ['email', 'name']

  if (accountPageProfileOverviewToggle && accountPageProfileOverview && accountPageProfileOverviewContent) {
    accountPageProfileOverviewToggle.addEventListener('click', function () {
      var isCollapsed = accountPageProfileOverview.classList.toggle('is-collapsed')
      accountPageProfileOverviewToggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true')
    })
  }

  function renderAccountPageProfileOverview() {
    if (!accountPageProfileOverviewList || !accountPageProfileOverview) return
    accountPageProfileOverviewList.innerHTML = ''
    var getEntries = typeof window.__prestixGetProfileOverviewEntries === 'function' ? window.__prestixGetProfileOverviewEntries : null
    var profileData = typeof window.__prestixGetProfileData === 'function' ? window.__prestixGetProfileData() : null
    if (!getEntries || !profileData) {
      accountPageProfileOverview.hidden = true
      return
    }
    var entries = getEntries(profileData)
    entries.forEach(function (item) {
      var dt = document.createElement('dt')
      dt.className = 'account-page-profile-overview-key'
      dt.textContent = item.label
      var dd = document.createElement('dd')
      dd.className = 'account-page-profile-overview-value'
      dd.textContent = item.value
      accountPageProfileOverviewList.appendChild(dt)
      accountPageProfileOverviewList.appendChild(dd)
    })
    accountPageProfileOverview.hidden = entries.length === 0
    var accountPageStepsWrap = document.getElementById('account-page-steps-wrap')
    if (accountPageStepsWrap) accountPageStepsWrap.hidden = entries.length > 0
  }

  var accountPageProfileOverviewEdit = document.getElementById('account-page-profile-overview-edit')
  if (accountPageProfileOverviewEdit && typeof window.__prestixOpenDrawerInEditMode === 'function') {
    accountPageProfileOverviewEdit.addEventListener('click', function () {
      window.__prestixOpenDrawerInEditMode()
    })
  }

  window.__prestixRefreshAccountPageProfileOverview = renderAccountPageProfileOverview

  function renderAccountPageUserData(user) {
    if (!accountPageUserDataList) return
    accountPageUserDataList.innerHTML = ''
    if (!user || typeof user !== 'object') return
    var t = typeof window.__prestixT === 'function' && window.__prestixT
    ACCOUNT_USER_KEYS.forEach(function (key) {
      var val = user[key]
      var dt = document.createElement('dt')
      dt.className = 'account-page-user-data-key'
      dt.textContent = t ? (t('account.field_' + key) || key) : key
      var dd = document.createElement('dd')
      dd.className = 'account-page-user-data-value'
      dd.textContent = val == null ? '' : String(val)
      accountPageUserDataList.appendChild(dt)
      accountPageUserDataList.appendChild(dd)
    })
  }

  function renderAccountPageNdaStatus() {
    if (!accountPageUserDataList) return
    var t = typeof window.__prestixT === 'function' && window.__prestixT
    var label = t ? (t('account.nda_accepted') || 'NDA accepted') : 'NDA accepted'
    var dt = document.createElement('dt')
    dt.className = 'account-page-user-data-key'
    dt.textContent = label
    var dd = document.createElement('dd')
    dd.className = 'account-page-user-data-value account-page-user-data-value--nda'
    dd.textContent = '—'
    accountPageUserDataList.appendChild(dt)
    accountPageUserDataList.appendChild(dd)
    fetch('/api/nda', { credentials: 'include' })
      .then(function (r) {
        if (r.ok) return r.json()
        return { accepted: false }
      })
      .then(function (data) {
        var yesLabel = t ? (t('account.nda_yes') || 'Yes') : 'Yes'
        var noLabel = t ? (t('account.nda_no') || 'No') : 'No'
        dd.textContent = data && data.accepted ? yesLabel : noLabel
      })
      .catch(function () {
        dd.textContent = t ? (t('account.nda_no') || 'No') : 'No'
      })
  }

  function renderSession(user) {
    if (!signinActions || !signedInBlock) return
    if (user && (user.email || user.name)) {
      showAuthError('')
      clearAuthErrorFromUrl()
      signinActions.hidden = true
      signedInBlock.hidden = false
      if (userImage) {
        userImage.onerror = function () {
          userImage.hidden = true
          if (userImagePlaceholder) {
            userImagePlaceholder.textContent = (user && user.name && user.name.charAt(0)) ? user.name.charAt(0).toUpperCase() : '?'
            userImagePlaceholder.hidden = false
          }
        }
        if (user.image && typeof user.image === 'string' && user.image.indexOf('http') === 0) {
          userImage.src = user.image
          userImage.alt = user.name || 'Profile'
          userImage.hidden = false
          if (userImagePlaceholder) userImagePlaceholder.hidden = true
        } else {
          userImage.removeAttribute('src')
          userImage.hidden = true
          if (userImagePlaceholder) {
            userImagePlaceholder.textContent = (user.name && user.name.charAt(0)) ? user.name.charAt(0).toUpperCase() : '?'
            userImagePlaceholder.hidden = false
          }
        }
      }
      if (userName) {
        var signedInLabel = typeof window.__prestixT === 'function' && window.__prestixT('account.signed_in')
        userName.textContent = user.name || signedInLabel || 'Signed in'
      }
      if (userEmail) userEmail.textContent = user.email || ''
      if (signoutBtn) signoutBtn.href = '/api/auth/signout?callbackUrl=' + encodeURIComponent(getCallbackUrl())
      renderAccountPageUserData(user)
      renderAccountPageNdaStatus()
      renderAccountPageProfileOverview()
    } else {
      signinActions.hidden = false
      signedInBlock.hidden = true
      if (userImagePlaceholder) userImagePlaceholder.hidden = true
      if (accountPageUserDataList) accountPageUserDataList.innerHTML = ''
    }
    updateHeaderAvatar(user)
    updateSigninLink()
  }

  window.__prestixRefreshAccountPageUserData = function () {
    if (window.__prestixUser && accountPageUserDataList) renderAccountPageUserData(window.__prestixUser)
  }

  function checkSession() {
    fetch('/api/auth/session', { credentials: 'include' })
      .then(function (res) { return res.json() })
      .then(function (data) {
        var user = data.user || null
        try {
          if (user) {
            var uid = user.id || user.sub || ''
            if (uid) sessionStorage.setItem('prestix-user-id', String(uid))
          } else {
            localStorage.removeItem('prestix-user-id')
            sessionStorage.removeItem('prestix-user-id')
            if (typeof window.__prestixShowSigninModal === 'function') {
              window.__prestixShowSigninModal()
            }
          }
        } catch (e) {}
        if (user && typeof window.__prestixHideSigninModal === 'function') {
          window.__prestixHideSigninModal()
        }
        renderSession(user)
        window.__prestixUser = user
        if (typeof window.__prestixUpdateDrawerUserData === 'function') {
          window.__prestixUpdateDrawerUserData(user)
        }
        if (typeof window.__prestixSyncAdminSection === 'function') {
          window.__prestixSyncAdminSection()
        }
      })
      .catch(function () {
        try {
          localStorage.removeItem('prestix-user-id')
          sessionStorage.removeItem('prestix-user-id')
          if (typeof window.__prestixShowSigninModal === 'function') {
            window.__prestixShowSigninModal()
          }
        } catch (e) {}
        renderSession(null)
        window.__prestixUser = null
        if (typeof window.__prestixUpdateDrawerUserData === 'function') {
          window.__prestixUpdateDrawerUserData(null)
        }
        if (typeof window.__prestixSyncAdminSection === 'function') {
          window.__prestixSyncAdminSection()
        }
      })
  }

  function checkUrlError() {
    var params = new URLSearchParams(window.location.search)
    var hashParams = new URLSearchParams((window.location.hash || '').split('?')[1] || '')
    var err = params.get('error') || hashParams.get('error')
    if (err) {
      var msg =
        err === 'account_disabled'
          ? 'Your account has been disabled. Contact support if you believe this is an error.'
          : err === 'session_expired'
          ? 'Sign-in expired. Try again.'
          : err === 'invalid_state'
            ? 'Invalid state. Try again.'
            : err === 'config_error'
              ? 'Server auth is not configured. Please try again later or contact support.'
              : err === 'token_exchange_redirect_uri_mismatch'
                ? 'Google sign-in: redirect URI mismatch. In Google Cloud Console, add this exact URL to Authorized redirect URIs: ' + (window.location.origin + '/api/auth/callback/google')
                : err === 'token_exchange_invalid_grant'
                  ? 'Sign-in link expired or already used. Try signing in again.'
                  : (err && err.indexOf('token_exchange_') === 0)
                    ? 'Google sign-in failed. Try again or check server logs for details.'
                    : 'Sign-in failed. Try again.'
      showAuthError(msg)
    } else {
      showAuthError('')
    }
  }

  window.__prestixCheckSession = checkSession
  updateSigninLink()
  checkUrlError()
  if (window.__prestixUser) {
    renderSession(window.__prestixUser)
  }
  checkSession()
  function isOnAccountRoute() {
    var p = (window.location.pathname || '').replace(/\/$/, '')
    return p === '/account' || p.indexOf('/account') === 0 || (window.location.hash || '').indexOf('account') !== -1
  }
  window.addEventListener('hashchange', function () {
    if (isOnAccountRoute()) {
      checkSession()
      checkUrlError()
    }
  })
  window.addEventListener('popstate', function () {
    if (isOnAccountRoute()) {
      checkSession()
      checkUrlError()
    }
  })
})()

/* Translate service: language from settings (prestix-lang), applied to [data-i18n] */
;(function () {
  var LANG_KEY = 'prestix-lang'
  var SUPPORTED = ['en', 'es', 'fr', 'de', 'id']

  var translations = {
    en: {
      'settings.title': 'Settings',
      'settings.theme': 'Theme',
      'settings.theme_desc': 'Choose light or dark appearance for the site.',
      'settings.theme_dark': 'Dark',
      'settings.theme_light': 'Light',
      'settings.language': 'Language',
      'settings.language_desc': 'Your choice applies to the entire site, including this Settings page. All labels and content will be shown in the selected language.',
      'settings.admin': 'Admin',
      'settings.admin_export_desc': 'Download all submitted user profiles as an Excel file. The file includes an "All Users" sheet and one sheet per user.',
      'settings.download_all_users': 'Download All User Data',
      'settings.admin_feedback_export_desc': 'Download responses to "Would you hire the bike?" (Yes/No) as an Excel file.',
      'settings.download_question_data': 'Download question data',
      'users.title': 'User management',
      'users.desc': 'Manage users who have signed in and assign admin role.',
      'users.drawer_title': 'User management',
      'users.manage': 'Manage users',
      'nda.title': 'Non-Disclosure Agreement',
      'nda.text': 'The information on this website, including business models, financials, roadmaps, and product details, is confidential and intended solely for qualified investors and partners. By accessing this site, you agree not to disclose, reproduce, or use any such information without prior written consent from Prestix.vip.',
      'nda.accept': 'Accept NDA',
      'push.title': 'Be the first to join',
      'push.text': 'Get a notification when the Prestix.vip marketplace launches. You\'ll be among the first to access the platform.',
      'push.close': 'Close',
      'signin.title': 'Sign in or Sign up',
      'signin.text': 'Use your Google account or email and password to continue.',
      'signin.continue_google': 'Continue with Google',
      'signin.or': 'or',
      'signin.tab_signin': 'Sign in',
      'signin.tab_signup': 'Sign up',
      'signin.skip': 'Skip for now',
      'header.search': 'Search…',
      'hero.tagline': 'The Future of<br/><span style="font-style:italic">Hospitality & Elite</span><br/>Experience<span class="hero-dot">.</span>',
      'hero.tagline_promoter': 'Simply<br/><span style="font-style:italic">Promote & Earn</span><span class="hero-dot">.</span>',
      'hero.tagline_partner': 'Streamline & Scale',
      'hero.tagline_organizer': 'Run & Settle',
      'hero.choose_experience': 'Choose your experience to see relevant content',
      'hero.subline': 'Built for Venue Management, Event Organizers & Promoters.',
      'hero.benefit': 'All inclusive Promoters Hub, for Venues, Event Organizers & Promoters.',
      'hero.benefit_promoter': 'Instant automated payment split. 10% commission at the point of sale—the marketplace streamlines your promotional operations.',
      'hero.benefit_partner': 'One dashboard to manage promoters and event organizers, track performance, and scale your venue. Instant payouts, VIP alerts, promoter leaderboard.',
      'hero.benefit_organizer': 'Run events with instant settlement. Set your event\'s promotion percentage to attract more promoters; target your social community with guidelines and targeted promotions to specific members.',
      'role.title': 'Choose your profile<span class="hero-dot">.</span>',
      'role.subtitle': 'Prestix.vip is first and foremost a Promoters Hub—to optimize, manage, track and scale venue promotional operations. Choose your profile so we can tailor the app and your experience.',
      'role.all': 'All',
      'role.all_desc': 'Overview for venues, event organizers and promoters.',
      'role.user': 'User',
      'role.user_desc': 'VIP access, recognition, zero friction at partner venues.',
      'role.promoter': 'Promoter',
      'role.promoter_desc': 'Optimize, manage, track and scale your venue promotional operations. 10% commission, paid instantly.',
      'role.partner': 'Partner',
      'role.partner_desc': 'Manage promoters, track performance, scale your venue. One dashboard, instant payouts, VIP alerts.',
      'role.organizer': 'Event Organizer',
      'role.organizer_desc': 'Run events with instant settlement. Set promotion %, target your community with guidelines, and run targeted promotions to specific members.',
      'platform.for_organizers_heading': 'For Event Organizers',
      'platform.for_organizers_text': 'Run events with instant settlement for you, your venue and promoters. One marketplace, one flow—ticketing, tables and payouts in sync. Set your event\'s promotion percentage to attract more promoters to promote it. Have promoters promote to your social community: set guidelines they must follow and run targeted promotions to specific members. Integrate with major vendors; everyone gets paid at the point of sale.',
      'section.mission': 'The Mission',
      'section.mission_sub': 'An all-inclusive Promoters Hub — one platform for Venues, Event Organizers & Promoters. Prestix.vip',
      'section.platform': 'Marketplace',
      'section.platform_sub': 'A fair marketplace with streamlined operations and transparent value for everyone',
      'section.venues': 'Partnership for Venues',
      'section.venues_sub': 'Partner venues and how they work for you',
      'section.value': 'Unique Value',
      'section.value_sub': 'What you gain',
      'section.roadmap': 'Roadmap',
      'section.roadmap_sub': 'Where we are and what\'s next—path to operational breakeven',
      'section.experience': 'Exclusive VIP Experience',
      'section.experience_sub': 'Hiring a bike isn\'t just transport—it\'s an all-access pass.',
      'section.contact': 'Contact Us',
      'section.contact_sub': 'Drop us a line!',
      'mission.all': 'We serve <strong>Venues, Event Organizers & Promoters</strong> through an <strong>all-inclusive Promoters Hub</strong>—one platform for all promotional needs. As a guest, the bike is your <strong>VIP key</strong> to partner venues: recognition, dedicated tables, and a <strong>money-can\'t-buy</strong> experience. As a promoter, you get a <strong>Frictionless Payout Engine</strong>: commission at the point of sale. As a venue or event organizer, you get real-time liquidity, one dashboard, and full control over promotional spend and VIP arrivals. Instant settlement, frictionless payouts, and a tech-enabled ecosystem with a clear path to profitability.',
      'mission.patron': 'We serve <strong>Venues, Event Organizers & Promoters</strong> through an <strong>all-inclusive Promoters Hub</strong>—one platform for all promotional needs. As a guest, the bike is your <strong>VIP key</strong> to partner venues: recognition, dedicated tables, and a <strong>money-can\'t-buy</strong> experience—no name-dropping, no wait.',
      'mission.promoter': 'We serve <strong>Venues, Event Organizers & Promoters</strong> through an <strong>all-inclusive Promoters Hub</strong>—one platform for all your promotional needs. As a promoter, you get a <strong>Frictionless Payout Engine</strong>: commission delivered at the point of sale, ',
      'mission.management': 'We serve <strong>Venues, Event Organizers & Promoters</strong> with an <strong>all-inclusive Promoters Hub</strong>—one platform for all promotional needs. As a venue or event organizer, you get real-time liquidity, one dashboard, and full control over promotional spend and VIP arrivals.',
      'mission.investor': 'Prestix.vip is an <strong>all-inclusive Promoters Hub</strong> serving <strong>Venues, Event Organizers & Promoters</strong>—one platform for all promotional needs. Instant settlement, frictionless payouts, and a tech-enabled ecosystem (branded fleet, venue dashboard, promoter tools) with a clear path to profitability.',
      'platform.lead': 'Prestix.vip gives promoters and venues the tools and clarity they need to run promotions at scale—without guesswork, without manual bottlenecks, and with clear visibility into who drives real business.',
      'platform.for_venues_heading': 'For Venues',
      'platform.for_venues_text': 'Promotional analysis and tracking in one dashboard, plus a promoters leaderboard so you see who drives results. Validate promotional budgets and get real-time alert notifications. AI automation of repetitive workflows, customer service consistency, and lasting connections with patrons—while you settle with promoters instantly.',
      'platform.for_promoters_heading': 'For Promoters',
      'platform.for_promoters_text': 'A fair marketplace where the value you drive is clear and transparent. Your commission is tracked and paid instantly at the point of sale—no black boxes, no delayed payouts. Single source of truth so your contribution is visible and rewarded.',
      'platform.close': 'We integrate with all major ticket third-party vendors: the marketplace can act as the single source of truth or as a middleman that automates the instant payment split after the buyer completes purchase—so the reserved ticket or table is secured and the venue receives its share. Buyers can pay for tables and tickets with <strong>card, Apple Pay, or crypto (ETH, USDT, etc.)</strong>. All transactions meet the highest <strong>security and privacy</strong> standards and are <strong>regulatory compliant with local laws and regulations</strong>. Together with the branded hybrid fleet, the marketplace also grants guests <strong>"Black Card"</strong> status via GPS-proximity alerts at partner venues.',
      'platform.investor': '<strong>Product:</strong> Branded fleet + iOS marketplace with real-time booking and GPS. <strong>Revenue model:</strong> 10% promoter / 2.5% marketplace / 87.5% venue instant split. Card, Apple Pay, crypto. <strong>Venue dashboard:</strong> Live arrival command center, proximity alerts, financial transparency. Scalable across premier venues in any market.',
      'venues.patron': 'Prestix.vip partner venues recognise you when you arrive on the bike. You get <strong>dedicated tables</strong>, <strong>free entry</strong>, and <strong>front-of-house valet</strong>. No queue, no door list—your access is built in. Book through the platform and show up; the venue is ready for you.',
      'venues.promoter': 'Every sale on the marketplace is validated and settled <strong>instantly</strong>—venue gets its share, you get <strong>10%</strong>, platform runs the split in one flow. No double-booking, no payment lag. Venues see a promoter leaderboard and real-time alerts so they know who drives results.',
      'venues.management_lead': 'We integrate with <strong>all major ticket third-party vendors</strong>. Every ticket or table reserved through the marketplace is validated and available—whether the marketplace is your <strong>single source of truth</strong> or we act as the <strong>middleman</strong> that automates the instant payment split the moment the buyer completes purchase. The venue receives its payment; promoters and marketplace are settled in the same flow. No double-booking, no payment lag.',
      'venues.benefit_1': 'Promotional analysis & tracking — One dashboard. See which campaigns and promoters drive traffic and revenue.',
      'venues.benefit_2': 'Promoters leaderboard — Rank and compare promoter performance so you invest budget where it pays off.',
      'venues.benefit_3': 'Validate promotional budget — Track spend and ROI in real time; align budgets with actual results.',
      'venues.benefit_4': 'Real-time alert notifications — VIP arrivals, sales milestones, and operational updates so your team can act immediately.',
      'venues.benefit_5': 'Customer service consistency — Same high standard for every guest; the platform supports process so quality doesn\'t depend on who\'s on shift.',
      'venues.benefit_6': 'Building lasting connections — From first touch to repeat visits, the experience is designed to turn guests into regulars and partners into long-term relationships.',
      'venues.integrations_title': 'Major ticket vendors & integration',
      'venues.integrations_intro': 'The marketplace connects with leading ticketing platforms via API and SDK where available, so inventory and sales stay in sync and instant settlement works across your existing stack.',
      'venues.integrations_note': 'Additional vendors can be supported via custom integration; we prioritise platforms that expose public or partner APIs and SDKs for secure, real-time sync.',
      'venues.compliance_title': 'Payment options & regulatory compliance',
      'venues.compliance_text': 'Tables and venue tickets can be purchased with <strong>card, Apple Pay, or crypto (ETH, USDT, and other supported tokens)</strong>. We emphasise <strong>best-in-class security and privacy</strong>; the platform is <strong>regulatory compliant with all applicable local laws and regulations</strong> in every market we serve.',
      'venues.close': 'For investors and venue operators: this is the utility behind the partnership—streamlined promotional operations, transparent value, and a marketplace that secures inventory and pays everyone instantly.',
      'venues.investor': 'Integration with <strong>Eventbrite, Ticketmaster, DICE, See Tickets</strong>. Single source of truth or middleman for instant payment split. No double-booking, no payment lag. Venue dashboard: promotional analysis, promoters leaderboard, real-time VIP arrival alerts (e.g. 500m). Payment and regulatory compliance in all markets.',
      'venues.onboarding_title': 'Venue onboarding — Become a partner',
      'venues.onboarding_lead': 'To become a Prestix.vip partner, a venue purchases a partnership. This gives the venue complete access to all platform utilities and opens the marketplace so the partner\'s current promotional operational processes can be integrated with the marketplace specifically for that partner.',
      'venues.onboarding_privacy': 'The partner can choose to keep all aspects of their current operations private in the marketplace, or enable the public section of operations.',
      'venues.onboarding_fee': 'Monthly partnership membership fee: $500 USD per month.',
      'value.patron_h': 'For the Patron',
      'value.patron_p': 'The bike is the <strong>Key.</strong> Dedicated tables, free entry, and front-of-house valet at partner venues. Skip the queue—recognition is built in.',
      'value.promoter_h': 'For the Promoter',
      'value.promoter_p': '<strong>10% commission</strong> delivered instantly at the point of sale. One dashboard, full transparency.',
      'value.venue_h': 'For the Venue',
      'value.venue_p': '<strong>87.5%</strong> instant revenue split. Promotional analysis, promoters leaderboard, real-time alerts. VIP arrivals announced 500m before the door. Integrates with Eventbrite, Ticketmaster, DICE, See Tickets.',
      'value.investor_h': 'Investor summary',
      'value.investor_p': '<strong>Viability:</strong> Market 9/10, Model 8/10, Revenue 8/10, Advantage 9/10, Scalability 8/10. <strong>CAPEX:</strong> ~AUD 40,000. <strong>Revenue:</strong> rental AUD 60–80/event; 2.5% transaction fee. <strong>4-month target:</strong> operational breakeven at ~75% fleet utilization. Unique positioning: instant settlement + VIP flywheel.',
      'roadmap.intro': 'We\'re rolling out the bike and Black Card experience at partner venues. Prestix.vip is executing a <strong>4-month plan</strong> from foundation to profitability. The timeline below shows our phases, current position, and the milestones still to accomplish. <a href="#contact" class="roadmap-link">Get in touch</a> to join early access or discuss integration.',
      'roadmap.patron_intro': 'We\'re rolling out the bike and Black Card experience at partner venues. Next: more cities, more venues, and seamless booking so you can reserve your ride and your table in one flow. <a href="#contact" class="roadmap-link">Get in touch</a> to join early access.',
      'roadmap.promoter_intro': 'Prestix.vip is executing a <strong>4-month plan</strong> from foundation to profitability. The timeline below shows our phases, current position, and the milestones still to accomplish.',
      'roadmap.we_here': 'We are here',
      'roadmap.phase_1_title': 'Foundation & Brand Alignment',
      'roadmap.phase_1_desc': 'Secure fleet; finalize venue-specific branding and detailing. Establish the "Invited Promoters" list and deploy the instant payment split (10% / 2.5% / 87.5%).',
      'roadmap.phase_2_title': 'Launch at Anchor Venues',
      'roadmap.phase_2_desc': 'Go-live at 2 anchor partner venues (Venue X). Promoters see their first instant payouts. Target: 40% fleet utilization and early rental revenue.',
      'roadmap.phase_3_title': 'VIP Activation & Scale',
      'roadmap.phase_3_desc': 'Market the bike as "The Only Way to Arrive." Expand to additional partner venues. 2.5% transaction fees compound as ticket volume grows.',
      'roadmap.phase_4_title': 'Optimization & Profitability',
      'roadmap.phase_4_desc': 'Use GPS and venue data to optimize bike placement. Target 75% fleet utilization. Achieve <strong>operational breakeven</strong> and net positive cash flow.',
      'roadmap.in_progress': 'In progress',
      'roadmap.todo': 'To do',
      'roadmap.phase_1_item1': 'Fleet and branding scope',
      'roadmap.phase_1_item2': 'Onboard first 20 A-List promoters',
      'roadmap.phase_1_item3': 'Payment engine live at pilot venue',
      'roadmap.phase_2_item1': 'Full integration with 2 anchor venues',
      'roadmap.phase_2_item2': 'Promoter wallet onboarding complete',
      'roadmap.phase_2_item3': 'Hit 40% weekend fleet utilization',
      'roadmap.phase_3_item1': 'VIP-focused campaign live',
      'roadmap.phase_3_item2': 'Additional venues integrated',
      'roadmap.phase_3_item3': 'Transaction volume scaling',
      'roadmap.phase_4_item1': 'Data-driven placement and routing',
      'roadmap.phase_4_item2': '75% fleet utilization target',
      'roadmap.phase_4_item3': 'Monthly OpEx covered; net positive',
      'roadmap.outro': 'Next step: partner agreements and venue dashboard rollout for VIP arrival alerts. <a href="#contact" class="roadmap-link">Get in touch</a> to discuss integration or investment.',
      'roadmap.investor_intro': '<strong>4-month path to profitability:</strong> Mo 1 — Fleet & branding, onboard top 20 promoters, payment engine. Mo 2 — Go-live at 2 anchor venues, 40% fleet utilization. Mo 3 — Scale to more venues, 2.5% transaction volume grows. Mo 4 — 75% fleet utilization, operational breakeven, <strong>net positive cash flow</strong>. We are in Phase 1. <a href="#contact" class="roadmap-link">Contact for full deck and terms</a>.',
      'roadmap.weeks_1_4': 'Weeks 1–4',
      'roadmap.weeks_5_8': 'Weeks 5–8 · Month 2',
      'roadmap.weeks_9_12': 'Weeks 9–12 · Month 3',
      'roadmap.weeks_13_16': 'Weeks 13–16 · Month 4',
      'roadmap.phase_num_1': 'Phase 1',
      'roadmap.phase_num_2': 'Phase 2',
      'roadmap.phase_num_3': 'Phase 3',
      'roadmap.phase_num_4': 'Phase 4',
      'experience.lead': 'The Prestix.vip branded hybrid bike is your <strong>VIP key</strong> to partner venues. From the moment you book, you\'re not just getting from A to B—you\'re stepping into a curated journey where recognition, access, and belonging are built in. Here\'s how it works, and why it delivers an experience that goes beyond what money alone can buy.',
      'experience.recognition_title': 'Automated VIP Recognition',
      'experience.recognition_p1': 'When you approach a partner venue on the app-tracked bike, the system knows you\'re coming. Venue staff are alerted in real time and can prepare a <strong>dedicated table</strong> and a personalised welcome—no name-dropping, no waiting at the door to "see if something\'s available."',
      'experience.recognition_p2': 'This isn\'t about buying a table; it\'s about being <strong>expected</strong>. The methodology works because the venue is incentivised by instant settlement to treat every Prestix.vip arrival as a priority. You get the kind of recognition that used to require long-standing relationships or luck—now it\'s built into the product. The result: you walk in feeling like a regular, not a stranger.',
      'experience.perks_title': 'Priority Perks',
      'experience.perks_p1': '<strong>Free valet</strong> for the bike and <strong>immediate walk-in entry</strong> mean you skip every queue—no ticket line, no door list, no "just wait here." You\'re ushered in with the kind of efficiency that turns a night out into a seamless, five-star flow.',
      'experience.perks_p2': 'That flow matters. When friction disappears, you\'re free to focus on what actually makes the evening: the music, the crowd, the conversation. Priority perks aren\'t just conveniences; they\'re the foundation for an <strong>instant 5-star experience</strong>. You\'re not paying extra at the door for a better spot—you\'ve already earned it by choosing the bike. The system aligns your comfort with the venue\'s operational clarity, so the best experience is also the default one.',
      'experience.settlement_title': 'Real-Time Settlement',
      'experience.settlement_p1': 'Buyers can purchase <strong>tables or venue tickets</strong> with card, Apple Pay, or <strong>crypto</strong>—including <strong>ETH</strong>, <strong>USDT</strong>, and other supported tokens. Behind the scenes, funds are split <strong>instantly</strong>: Promoter 10%, Marketplace 2.5%, Venue 87.5%. No lag time; everyone is paid at the point of sale.',
      'experience.settlement_p2': 'Why does that improve your experience? Because instant settlement aligns everyone\'s incentives. The promoter and venue are motivated to make your visit flawless—their revenue is already secured. Staff are primed to deliver, tables are ready, and the whole operation runs with the certainty of real-time payouts. You feel the difference in smoother service and a venue that\'s genuinely set up to welcome you.',
      'experience.compliance_title': 'Security, Privacy & Compliance',
      'experience.compliance_p': 'All payment and data handling meets the highest standards of <strong>security and privacy</strong>. The platform is <strong>regulatory compliant with local laws and regulations</strong> in each market we operate in—so whether you pay with card or crypto, your transaction is secure and compliant.',
      'experience.why_title': 'Why This Methodology Works: Beyond Money',
      'experience.why_p1': 'The best nights aren\'t the ones you simply pay for—they\'re the ones where you\'re <strong>recognised</strong>, <strong>included</strong>, and surrounded by people who share the same standard. Prestix.vip is designed to deliver that.',
      'experience.why_p2': '<strong>Entertainment that money can\'t buy:</strong> You can\'t purchase the moment a host greets you by name, or the feeling of walking straight to a reserved table while others wait. You can\'t buy the confidence of knowing the venue has already prepared for you. Those moments come from a system that treats your arrival as an event—not a transaction. The bike is the signal; the platform and the partners do the rest.',
      'experience.why_p3': '<strong>Connecting with like-minded people:</strong> Everyone on a Prestix.vip bike has chosen the same path: premium mobility, partner venues, and a no-friction night. You\'re in rooms with people who value experience over hassle. That shared choice creates a natural filter—you\'re not just in a crowd; you\'re among guests who get it. The result is a higher chance of real connection, whether that\'s a conversation at the bar or a table that feels like the right room.',
      'experience.why_p4': '<strong>Instant 5-star experience:</strong> No vouchers to show, no awkward "I\'m on the list" at the door. From bike to table, the experience is continuous. You\'re not buying upgrades on the night; you\'re already in the tier that gets the best treatment. That\'s the core of the methodology: design the product so that the default outcome is excellence, and every guest receives the same elevated standard from the moment they arrive.',
      'experience.why_p5': 'Hiring the bike isn\'t just transport—it\'s an <strong>all-access pass</strong> to recognition, priority, and a room full of people who expect the same. That\'s the future of hospitality we\'re building.',
      'contact.name_placeholder': 'Name',
      'contact.email_placeholder': 'Email*',
      'contact.message_placeholder': 'Message',
      'account.title': 'Account',
      'account.signin_title': 'Sign Up / Sign In',
      'account.signin_text': 'Sign in with Google to manage your Prestix.vip profile, preferences, and notifications.',
      'account.continue_google': 'Continue with Google',
      'account.account_data': 'Account data',
      'account.sign_out': 'Sign out',
      'account.preferences_title': 'User Preferences',
      'account.preferences_text': 'Provide your role and preferences so we can classify your profile and personalize the app and services for you. Your choices are saved to your account and used across your experience.',
      'account.notifications_title': 'Notifications',
      'account.notifications_text': 'Choose how you want to be notified when the marketplace launches and when you have updates. You can enable push notifications or use Notify at launch from the menu.',
      'drawer.account': 'Account',
      'drawer.account_data': 'Account data',
      'drawer.theme_language': 'Theme & Language',
      'drawer.not_signed_in': 'Not signed in',
      'drawer.sign_out': 'Sign out',
      'drawer.select_profile': 'Welcome to Prestix.vip. Let\'s build something great.',
      'drawer.select_profile_text': 'Help us tailor your experience by taking a minute to answer the questions below.',
      'drawer.benefits_for_profile': 'Benefits for your profile',
      'profile.completion': 'Profile {p}% complete',
      'profile.status_complete': '{p}% Complete',
      'profile.name': 'Name',
      'profile.email': 'Email',
      'profile.company_or_handle': 'Company or social handle',
      'profile.event_types': 'Types of events you promote',
      'profile.volume': 'Expected volume (optional)',
      'profile.venue_name': 'Venue name',
      'profile.role_at_venue': 'Your role at venue',
      'profile.market': 'Market / city (optional)',
      'profile.investment_focus': 'Investment focus (optional)',
      'profile.contact_preference': 'Preferred contact method',
      'profile.how_heard': 'How did you hear about us?',
      'profile.comments': 'Additional comments (optional)',
      'profile.event_nightlife': 'Nightlife',
      'profile.event_concerts': 'Concerts',
      'profile.event_private': 'Private events',
      'profile.event_corporate': 'Corporate events',
      'profile.event_festivals': 'Festivals',
      'profile.event_sports': 'Sports',
      'profile.event_other': 'Other',
      'profile.volume_under_50': 'Under 50 / month',
      'profile.volume_50_200': '50–200 / month',
      'profile.volume_200_500': '200–500 / month',
      'profile.volume_500_plus': '500+ / month',
      'profile.volume_prefer_not': 'Prefer not to say',
      'profile.role_gm': 'GM',
      'profile.role_owner': 'Owner',
      'profile.role_events_manager': 'Events Manager',
      'profile.role_marketing': 'Marketing',
      'profile.role_other': 'Other',
      'profile.how_social': 'Social media',
      'profile.how_referral': 'Referral',
      'profile.how_online_ad': 'Online ad',
      'profile.how_event': 'Event',
      'profile.how_search': 'Search',
      'profile.how_other': 'Other',
      'profile.save': 'Save profile',
      'profile.saved_local': 'Profile saved locally.',
      'profile.saved_uploaded': 'Profile saved and sent to the team.',
      'profile.save_failed': 'Could not save. Try again.',
      'drawer.back': 'Back',
      'drawer.cancel': 'Cancel',
      'drawer.next': 'Next',
      'drawer.done': 'Done',
      'drawer.save': 'Save',
      'drawer.profile_overview': 'Profile overview',
      'drawer.step_of': 'Step {n} of 9',
      'questions.opt_empty': '—',
      'questions.opt_other': 'Other',
      'questions.opt_interest_commission': 'Commission & instant payouts',
      'questions.opt_interest_events': 'Event types I can promote',
      'questions.opt_interest_getting_started': 'Getting started',
      'questions.opt_interest_volume': 'Volume & scaling',
      'questions.opt_interest_onboarding': 'Onboarding process for promoters',
      'questions.opt_interest_integrate': 'How to integrate our venue',
      'questions.opt_interest_dashboard': 'Dashboard & instant payouts',
      'questions.opt_interest_vip_alerts': 'VIP alerts & recognition',
      'questions.opt_interest_roi': 'ROI & unit economics',
      'questions.opt_interest_vip': 'VIP access & recognition',
      'questions.opt_interest_booking': 'Booking the bike & tables',
      'questions.opt_interest_venues': 'Partner venues & experience',
      'questions.opt_contact_email': 'Email',
      'questions.opt_contact_call': 'Call',
      'questions.opt_contact_whatsapp': 'WhatsApp',
      'questions.opt_timeline_asap': 'As soon as possible',
      'questions.opt_timeline_1_3': '1–3 months',
      'questions.opt_timeline_3_6': '3–6 months',
      'questions.opt_timeline_exploring': 'Just exploring',
      'questions.opt_venue_nightclub': 'Nightclub',
      'questions.opt_venue_restaurant': 'Restaurant',
      'questions.opt_venue_bar': 'Bar',
      'questions.opt_venue_event_space': 'Event space',
      'questions.opt_market_sydney': 'Sydney',
      'questions.opt_market_melbourne': 'Melbourne',
      'questions.opt_market_brisbane': 'Brisbane',
      'questions.opt_market_london': 'London',
      'questions.opt_market_paris': 'Paris',
      'questions.opt_market_berlin': 'Berlin',
      'questions.opt_market_madrid': 'Madrid',
      'questions.opt_market_barcelona': 'Barcelona',
      'questions.opt_market_amsterdam': 'Amsterdam',
      'questions.opt_market_rome': 'Rome',
      'questions.opt_market_milan': 'Milan',
      'questions.opt_market_ibiza': 'Ibiza',
      'questions.opt_market_new_york': 'New York',
      'questions.opt_market_la': 'Los Angeles',
      'questions.opt_market_miami': 'Miami',
      'questions.opt_market_las_vegas': 'Las Vegas',
      'questions.opt_market_chicago': 'Chicago',
      'questions.opt_market_san_francisco': 'San Francisco',
      'questions.opt_market_toronto': 'Toronto',
      'questions.opt_market_vancouver': 'Vancouver',
      'questions.opt_market_mexico_city': 'Mexico City',
      'questions.opt_market_tokyo': 'Tokyo',
      'questions.opt_market_singapore': 'Singapore',
      'questions.opt_market_hong_kong': 'Hong Kong',
      'questions.opt_market_bangkok': 'Bangkok',
      'questions.opt_market_dubai': 'Dubai',
      'questions.opt_market_sao_paulo': 'São Paulo',
      'questions.opt_market_buenos_aires': 'Buenos Aires',
      'questions.q1.promoter.title': 'What are you most interested in?',
      'questions.q1.promoter.placeholder': 'e.g. @yourhandle or company name',
      'questions.q1.partner.title': 'What are you most interested in?',
      'questions.q1.partner.placeholder': 'Name of your venue',
      'questions.q1.marketplace.title': 'What are you most interested in?',
      'questions.q1.marketplace.placeholder': 'Optional',
      'questions.q2.promoter.title': 'Types of events you promote',
      'questions.q2.promoter.placeholder': 'e.g. nightlife, festivals, private events',
      'questions.q2.partner.title': 'Your role at venue',
      'questions.q2.partner.placeholder': 'e.g. GM, Owner, Events Manager',
      'questions.q2.marketplace.title': 'How did you hear about us?',
      'questions.q2.marketplace.placeholder': 'Optional',
      'questions.q3.promoter.title': 'Expected volume (optional)',
      'questions.q3.promoter.placeholder': 'Events per month or year',
      'questions.q3.partner.title': 'Market / city',
      'questions.q3.partner.placeholder': 'Where is your venue located?',
      'questions.q3.marketplace.title': 'Any comments?',
      'questions.q3.marketplace.placeholder': 'Optional',
      'questions.q4.promoter.title': 'How did you hear about us?',
      'questions.q4.promoter.placeholder': 'Optional',
      'questions.q4.partner.title': 'Venue capacity or type',
      'questions.q4.partner.placeholder': 'e.g. nightclub, restaurant, capacity',
      'questions.q4.marketplace.title': 'Anything else we should know?',
      'questions.q4.marketplace.placeholder': 'Optional',
      'questions.q5.promoter.title': 'Preferred contact method',
      'questions.q5.promoter.placeholder': 'e.g. Email, Call, WhatsApp',
      'questions.q5.partner.title': 'Preferred contact method',
      'questions.q5.partner.placeholder': 'e.g. Email, Call, WhatsApp',
      'questions.q5.marketplace.title': 'Preferred way to stay updated',
      'questions.q5.marketplace.placeholder': 'Optional',
      'questions.q5.contact_email_label': 'Email address',
      'questions.q5.contact_email_placeholder': 'Your email',
      'questions.q5.contact_whatsapp_label': 'WhatsApp number',
      'questions.q5.contact_whatsapp_placeholder': 'Phone number with country code',
      'questions.q5.contact_call_label': 'Phone number',
      'questions.q5.contact_call_placeholder': 'Phone number',
      'questions.q5.contact_other_label': 'Specify',
      'questions.q5.contact_other_placeholder': 'How should we contact you?',
      'questions.q6.promoter.title': 'Target markets or cities',
      'questions.q6.promoter.placeholder': 'Where do you promote?',
      'questions.q6.partner.title': 'Integration timeline',
      'questions.q6.partner.placeholder': 'When could you go live?',
      'questions.q6.marketplace.title': 'Anything else?',
      'questions.q6.marketplace.placeholder': 'Optional',
      'questions.q7.promoter.title': 'Current promoter experience',
      'questions.q7.promoter.placeholder': 'Years, types of events',
      'questions.q7.partner.title': 'Additional info about your venue',
      'questions.q7.partner.placeholder': 'Optional',
      'questions.q7.marketplace.title': 'Anything else?',
      'questions.q7.marketplace.placeholder': 'Optional',
      'questions.q8.promoter.title': 'Additional comments',
      'questions.q8.promoter.placeholder': 'Anything else we should know',
      'questions.q8.partner.title': 'Additional comments',
      'questions.q8.partner.placeholder': 'Anything else we should know',
      'questions.q8.marketplace.title': 'Additional comments',
      'questions.q8.marketplace.placeholder': 'Optional',
      'drawer.mission': 'Mission',
      'drawer.mission_text': 'An all-inclusive Promoters Hub for Venues, Event Organizers & Promoters. One platform for all promotional needs—instant payouts, one dashboard, VIP access.',
      'drawer.platform': 'Platform',
      'drawer.platform_text': 'A fair marketplace with streamlined operations and transparent value for venues and promoters.',
      'drawer.value': 'Value',
      'drawer.value_text': 'What you get: instant settlement, clear economics, and a single dashboard for your operations.',
      'drawer.venues': 'Venues',
      'drawer.venues_text': 'Partner venues and how we integrate with premier locations in your market.',
      'drawer.roadmap': 'Roadmap',
      'drawer.roadmap_text': 'Launch timeline and what\'s next for the marketplace and fleet.',
      'drawer.experience': 'Experience',
      'drawer.experience_text': 'The VIP experience: recognition, dedicated tables, and seamless entry at partner venues.',
      'drawer.feedback': 'Feedback',
      'drawer.feedback_text': 'What early partners and patrons are saying about Prestix.vip.',
      'drawer.contact': 'Contact & become a partner',
      'drawer.pitch': 'Investor Pitch',
      'nav.section_pitch': 'Pitch',
      'drawer.contact_text': 'Get in touch to join as a promoter or venue partner. We\'ll guide you through the next steps.',
      'drawer.go_mission': 'Go to Mission',
      'drawer.go_platform': 'Go to Platform',
      'drawer.go_value': 'Go to Value',
      'drawer.go_venues': 'Go to Venues',
      'drawer.go_roadmap': 'Go to Roadmap',
      'drawer.go_experience': 'Go to Experience',
      'drawer.go_feedback': 'Go to Feedback',
      'drawer.go_contact': 'Go to Contact',
      'feedback.question': 'Would you hire the bike?',
      'feedback.yes': 'Yes',
      'feedback.no': 'No',
      'feedback.comment_placeholder': 'Any comment (optional)',
      'feedback.submit': 'Send response',
      'feedback.thanks': 'Thanks for your feedback.',
      'contact.send': 'SEND',
      'contact.newsletter': 'Sign up for our email list for updates, promotions, and more.',
      'account.field_email': 'email',
      'account.field_name': 'name',
      'account.field_image': 'image',
      'account.nda_accepted': 'NDA accepted',
      'account.nda_yes': 'Yes',
      'account.nda_no': 'No',
      'account.signed_in': 'Signed in',
      'search.no_matches': 'No matches',
      'contact.sending': 'Sending…',
      'contact.thanks_message': "Thanks for your message. We'll be in touch.",
      'contact.error_generic': 'Something went wrong. Please try again or email support.',
      'nav.section_landing': 'Landing',
      'nav.section_pitch': 'Pitch',
      'nav.section_account': 'Account',
      'nav.section_settings': 'Settings',
    },
    es: {
      'settings.title': 'Ajustes',
      'settings.theme': 'Tema',
      'settings.theme_desc': 'Elige apariencia clara u oscura.',
      'settings.theme_dark': 'Oscuro',
      'settings.theme_light': 'Claro',
      'settings.language': 'Idioma',
      'settings.language_desc': 'Tu elección se aplica a todo el sitio, incluida esta página de Ajustes. Todas las etiquetas y el contenido se mostrarán en el idioma seleccionado.',
      'settings.admin': 'Administración',
      'settings.admin_export_desc': 'Descargar todos los perfiles de usuario enviados en un archivo Excel. El archivo incluye una hoja "Todos los usuarios" y una hoja por usuario.',
      'settings.download_all_users': 'Descargar todos los datos de usuarios',
      'settings.admin_feedback_export_desc': 'Descargar las respuestas a "¿Alquilarías la bici?" (Sí/No) en un archivo Excel.',
      'settings.download_question_data': 'Descargar datos de preguntas',
      'users.title': 'Gestión de usuarios',
      'users.desc': 'Gestionar usuarios que han iniciado sesión y asignar rol de administrador.',
      'users.drawer_title': 'Gestión de usuarios',
      'users.manage': 'Gestionar usuarios',
      'nda.title': 'Acuerdo de confidencialidad',
      'nda.text': 'La información de este sitio web, incluidos modelos de negocio, datos financieros, hojas de ruta y detalles del producto, es confidencial y está destinada únicamente a inversores y socios cualificados. Al acceder a este sitio, aceptas no divulgar, reproducir ni utilizar dicha información sin consentimiento previo por escrito de Prestix.vip.',
      'nda.accept': 'Aceptar NDA',
      'push.title': 'Sé el primero en unirte',
      'push.text': 'Recibe una notificación cuando se lance el marketplace Prestix.vip. Estarás entre los primeros en acceder a la plataforma.',
      'push.close': 'Cerrar',
      'signin.title': 'Iniciar sesión o registrarse',
      'signin.text': 'Usa tu cuenta de Google o correo y contraseña para continuar.',
      'signin.continue_google': 'Continuar con Google',
      'signin.or': 'o',
      'signin.tab_signin': 'Iniciar sesión',
      'signin.tab_signup': 'Registrarse',
      'signin.skip': 'Omitir por ahora',
      'header.search': 'Buscar…',
      'hero.tagline': 'Promociona y gana.',
      'hero.tagline_promoter': 'Promociona y gana.',
      'hero.tagline_partner': 'Optimiza y escala.',
      'hero.tagline_organizer': 'Organiza y liquida.',
      'hero.choose_experience': 'Elige tu experiencia para ver contenido relevante',
      'hero.subline': 'Impulsando a los promotores de eventos para construir relaciones más sólidas, llegar a audiencias y promover eventos.',
      'hero.benefit': 'Hub de Promotores integral para Venues, Organizadores de Eventos y Promotores.',
      'hero.benefit_promoter': 'Reparto de pago instantáneo y automatizado. El marketplace simplifica tus operaciones de promoción.',
      'hero.benefit_partner': 'Un panel para gestionar promotores, seguir el rendimiento y escalar tu local. Pagos al instante, alertas VIP, ranking de promotores.',
      'hero.benefit_organizer': 'Organiza eventos con liquidación instantánea. Fija el porcentaje de promoción de tu evento para atraer más promotores; dirige la promoción a tu comunidad con directrices y promociones dirigidas a miembros concretos.',
      'role.title': '¿Cómo usarás Prestix.vip?',
      'role.subtitle': 'Prestix.vip es ante todo un Hub para Promotores: optimizar, gestionar, seguir y escalar las operaciones de promoción en locales. Elige tu perfil para personalizar la app y tu experiencia.',
      'role.all': 'Todos',
      'role.all_desc': 'Resumen para locales, organizadores de eventos y promotores.',
      'role.organizer': 'Organizador de eventos',
      'role.organizer_desc': 'Organiza eventos con liquidación instantánea. Fija el % de promoción, dirige a tu comunidad con directrices y promociones dirigidas a miembros concretos.',
      'platform.for_organizers_heading': 'Para organizadores de eventos',
      'platform.for_organizers_text': 'Organiza eventos con liquidación instantánea para ti, tu local y promotores. Un marketplace, un flujo—entradas, mesas y pagos sincronizados. Fija el porcentaje de promoción de tu evento para atraer a más promotores. Haz que los promotores promocionen en tu comunidad: establece directrices que deben seguir y lanza promociones dirigidas a miembros concretos. Integración con los principales proveedores; todos cobran en el punto de venta.',
      'role.user': 'Usuario',
      'role.user_desc': 'Acceso VIP, reconocimiento, cero fricción en locales asociados.',
      'role.promoter': 'Promotor',
      'role.promoter_desc': 'Optimiza, gestiona, sigue y escala tus operaciones de promoción en locales. 10% de comisión, pagada al instante.',
      'role.partner': 'Partner',
      'role.partner_desc': 'Gestiona promotores, sigue el rendimiento, escala tu local. Un panel, pagos al instante, alertas VIP.',
      'role.marketplace': 'Usuario',
      'role.marketplace_desc': 'Acceso VIP, reconocimiento, cero fricción en locales asociados.',
      'section.mission': 'La misión',
      'section.mission_sub': 'Un Hub de Promotores integral — una plataforma para Venues, Organizadores de Eventos y Promotores. Prestix.vip',
      'section.platform': 'Marketplace',
      'section.platform_sub': 'Un mercado justo con operaciones simplificadas y valor transparente para todos',
      'section.venues': 'Colaboración con locales',
      'section.venues_sub': 'Locales asociados y cómo funcionan para ti',
      'section.value': 'Valor único',
      'section.value_sub': 'Qué obtienes',
      'section.roadmap': 'Hoja de ruta',
      'section.roadmap_sub': 'Dónde estamos y qué sigue: camino al punto de equilibrio',
      'section.experience': 'Experiencia VIP exclusiva',
      'section.experience_sub': 'Alquilar la bici no es solo transporte: es un pase de acceso total.',
      'section.contact': 'Contáctanos',
      'section.contact_sub': '¡Escríbenos!',
      'mission.all': 'Servimos a <strong>Venues, Organizadores de Eventos y Promotores</strong> con un <strong>Hub de Promotores integral</strong>—una plataforma para todas las necesidades promocionales. Como invitado, la bici es tu <strong>llave VIP</strong> a locales asociados: reconocimiento, mesas dedicadas y una experiencia <strong>que el dinero no puede comprar</strong>. Como promotor, tienes un <strong>motor de pagos sin fricción</strong>: comisión en el punto de venta, sin retrasos de 7–30 días. Como venue u organizador: liquidez en tiempo real, un panel y control total del gasto promocional y las llegadas VIP. Liquidación instantánea, pagos sin fricción y un ecosistema tecnológico con camino claro a la rentabilidad.',
      'mission.patron': 'Servimos a <strong>Venues, Organizadores de Eventos y Promotores</strong> con un <strong>Hub de Promotores integral</strong>—una plataforma para todas las necesidades promocionales. Como invitado, la bici es tu <strong>llave VIP</strong> a locales asociados: reconocimiento, mesas dedicadas y una experiencia <strong>que el dinero no puede comprar</strong>—sin nombres, sin esperas.',
      'mission.promoter': 'Servimos a <strong>Venues, Organizadores de Eventos y Promotores</strong> con un <strong>Hub de Promotores integral</strong>—una plataforma para todas tus necesidades promocionales. Como promotor, tienes un <strong>motor de pagos sin fricción</strong>: comisión en el punto de venta, sin retrasos de 7–30 días.',
      'mission.management': 'Servimos a <strong>Venues, Organizadores de Eventos y Promotores</strong> con un <strong>Hub de Promotores integral</strong>—una plataforma para todas las necesidades promocionales. Como venue u organizador, tienes liquidez en tiempo real, un panel y control total del gasto promocional y las llegadas VIP.',
      'mission.investor': 'PRESTIX.VIP es un <strong>Hub de Promotores integral</strong> para <strong>Venues, Organizadores de Eventos y Promotores</strong>—una plataforma para todas las necesidades promocionales. Liquidación instantánea, pagos sin fricción y un ecosistema tecnológico (flota de marca, panel de venue, herramientas para promotores) con camino claro a la rentabilidad.',
      'platform.lead': 'Prestix.vip da a promotores y locales las herramientas y claridad para ejecutar promociones a escala—sin suposiciones, sin cuellos de botella manuales y con visibilidad clara de quién genera negocio real.',
      'platform.for_users_heading': 'Para usuarios',
      'platform.for_users_text': 'Tu llave VIP a locales asociados. Experiencia premium, cero fricción: mesas dedicadas, reconocimiento al instante, valet para la bici. Paga con tarjeta, Apple Pay o cripto. El marketplace y la flota de marca te dan el estado "Black Card" por proximidad GPS en locales asociados.',
      'platform.for_venues_heading': 'Para locales',
      'platform.for_venues_text': 'Análisis y seguimiento promocional en un solo panel, más un ranking de promotores para ver quién genera resultados. Valida presupuestos promocionales y recibe alertas en tiempo real. Automatización IA de flujos repetitivos, consistencia en atención al cliente y conexiones duraderas con clientes—mientras liquidas con promotores al instante.',
      'platform.for_promoters_heading': 'Para promotores',
      'platform.for_promoters_text': 'Un marketplace justo donde el valor que generas es claro y transparente. Tu comisión se registra y paga al instante en el punto de venta—sin cajas negras ni pagos retrasados. Una única fuente de verdad para que tu contribución sea visible y recompensada.',
      'platform.close': 'Nos integramos con todos los principales proveedores de entradas: el marketplace puede ser la única fuente de verdad o un intermediario que automatiza el reparto de pago instantáneo tras la compra. Los compradores pueden pagar mesas y entradas con <strong>tarjeta, Apple Pay o cripto (ETH, USDT, etc.)</strong>. Todas las transacciones cumplen los más altos estándares de <strong>seguridad y privacidad</strong> y son <strong>conformes a la normativa local</strong>. Junto con la flota híbrida de marca, el marketplace otorga a los invitados el estado <strong>"Black Card"</strong> mediante alertas de proximidad GPS en locales asociados.',
      'platform.investor': '<strong>Producto:</strong> Flota de marca + marketplace iOS con reservas en tiempo real y GPS. <strong>Modelo de ingresos:</strong> 10% promotor / 2,5% marketplace / 87,5% local, reparto instantáneo. Tarjeta, Apple Pay, cripto. <strong>Panel del local:</strong> Centro de mando de llegadas, alertas de proximidad, transparencia financiera. Escalable en locales premium en cualquier mercado.',
      'venues.patron': 'Los locales asociados Prestix.vip te reconocen cuando llegas en bici. Tienes <strong>mesas reservadas</strong>, <strong>entrada gratuita</strong> y <strong>valet en puerta</strong>. Sin colas ni lista: tu acceso está incluido. Reserva en la plataforma y preséntate; el local está listo para ti.',
      'venues.promoter': 'Cada venta en el marketplace se valida y liquida <strong>al instante</strong>: el local recibe su parte, tú tu 10% y la plataforma ejecuta el reparto en un solo flujo. Sin doble reserva ni retraso de pago. Los locales ven un ranking de promotores y alertas en tiempo real para saber quién genera resultados.',
      'venues.management_lead': 'Nos integramos con <strong>todos los principales proveedores de entradas</strong>. Cada entrada o mesa reservada por el marketplace se valida y queda disponible, ya sea como <strong>única fuente de verdad</strong> o como <strong>intermediario</strong> que automatiza el reparto instantáneo en el momento del pago. El local cobra; promotores y marketplace se liquidan en el mismo flujo. Sin doble reserva ni retraso.',
      'venues.benefit_1': 'Análisis y seguimiento promocional — Un panel. Ver qué campañas y promotores generan tráfico e ingresos.',
      'venues.benefit_2': 'Ranking de promotores — Clasificar y comparar el rendimiento para invertir el presupuesto donde rinde.',
      'venues.benefit_3': 'Validar presupuesto promocional — Seguimiento de gasto y ROI en tiempo real; alinear presupuestos con resultados.',
      'venues.benefit_4': 'Alertas en tiempo real — Llegadas VIP, hitos de ventas y actualizaciones operativas para actuar de inmediato.',
      'venues.benefit_5': 'Consistencia en atención al cliente — Mismo estándar para cada invitado; la plataforma sostiene el proceso.',
      'venues.benefit_6': 'Conexiones duraderas — Desde el primer contacto hasta visitas repetidas; la experiencia convierte invitados en habituales.',
      'venues.integrations_title': 'Proveedores de entradas e integración',
      'venues.integrations_intro': 'El marketplace se conecta con plataformas de ticketing líderes vía API y SDK cuando está disponible, para mantener inventario y ventas sincronizados y liquidación instantánea en tu stack.',
      'venues.integrations_note': 'Otros proveedores pueden integrarse a medida; priorizamos plataformas con APIs/SDKs públicas o de socios para sincronización segura en tiempo real.',
      'venues.compliance_title': 'Opciones de pago y cumplimiento normativo',
      'venues.compliance_text': 'Mesas y entradas se pueden comprar con <strong>tarjeta, Apple Pay o cripto (ETH, USDT y otros tokens soportados)</strong>. Enfatizamos <strong>seguridad y privacidad de primer nivel</strong>; la plataforma <strong>cumple la normativa local aplicable</strong> en cada mercado.',
      'venues.close': 'Para inversores y operadores: esta es la utilidad de la asociación—operaciones promocionales simplificadas, valor transparente y un marketplace que asegura inventario y paga a todos al instante.',
      'venues.investor': 'Integración con <strong>Eventbrite, Ticketmaster, DICE, See Tickets</strong>. Fuente única de verdad o intermediario para reparto instantáneo. Sin doble reserva ni retraso. Panel: análisis promocional, ranking de promotores, alertas de llegada VIP (ej. 500 m). Cumplimiento de pago y normativa en todos los mercados.',
      'venues.onboarding_title': 'Incorporación de venue — Ser socio',
      'venues.onboarding_lead': 'Para ser socio de Prestix.vip, el venue adquiere una asociación. Esto da al venue acceso completo a todas las utilidades de la plataforma y abre el marketplace para que los procesos operativos promocionales actuales del socio se integren con el marketplace específicamente para ese socio.',
      'venues.onboarding_privacy': 'El socio puede elegir mantener todos los aspectos de sus operaciones actuales en privado en el marketplace, o activar la sección pública de las operaciones.',
      'venues.onboarding_fee': 'Cuota mensual de membresía de asociación: 500 USD al mes.',
      'value.patron_h': 'Para el invitado',
      'value.patron_p': 'La bici es la <strong>llave</strong>. Mesas reservadas, entrada gratuita y valet en locales asociados. Sin cola: el reconocimiento está incluido.',
      'value.promoter_h': 'Para el promotor',
      'value.promoter_p': '<strong>10% de comisión</strong> al instante en el punto de venta. Sin esperas de 7–30 días. Un panel, total transparencia.',
      'value.venue_h': 'Para el local',
      'value.venue_p': '<strong>87,5%</strong> de reparto instantáneo. Análisis promocional, ranking de promotores, alertas en tiempo real. Llegadas VIP anunciadas 500 m antes de la puerta. Integración con Eventbrite, Ticketmaster, DICE, See Tickets.',
      'value.investor_h': 'Resumen inversor',
      'value.investor_p': '<strong>Viabilidad:</strong> Mercado 9/10, Modelo 8/10, Ingresos 8/10, Ventaja 9/10, Escalabilidad 8/10. <strong>CAPEX:</strong> ~40.000 AUD. <strong>Ingresos:</strong> alquiler 60–80 AUD/evento; 2,5% comisión. <strong>Objetivo 4 meses:</strong> punto de equilibrio operativo con ~75% de uso de flota. Posicionamiento único: liquidación instantánea + efecto VIP.',
      'roadmap.intro': 'Estamos desplegando la bici y la experiencia Black Card en locales asociados. Prestix.vip ejecuta un <strong>plan de 4 meses</strong> desde la base hasta la rentabilidad. La línea de tiempo muestra fases, posición actual y hitos pendientes. <a href="#contact" class="roadmap-link">Contáctanos</a> para acceso anticipado o integración.',
      'roadmap.patron_intro': 'Estamos desplegando la bici y la experiencia Black Card en locales asociados. Siguiente: más ciudades, más locales y reserva fluida para reservar bici y mesa en un solo flujo. <a href="#contact" class="roadmap-link">Contáctanos</a> para acceso anticipado.',
      'roadmap.promoter_intro': 'Prestix.vip ejecuta un <strong>plan de 4 meses</strong> desde la base hasta la rentabilidad. La línea de tiempo muestra fases, posición actual y hitos pendientes.',
      'roadmap.we_here': 'Estamos aquí',
      'roadmap.phase_1_title': 'Fundación y alineación de marca',
      'roadmap.phase_1_desc': 'Asegurar flota; finalizar branding y detalle por local. Establecer lista "Promotores invitados" y desplegar reparto instantáneo (10% / 2,5% / 87,5%).',
      'roadmap.phase_2_title': 'Lanzamiento en locales ancla',
      'roadmap.phase_2_desc': 'Puesta en marcha en 2 locales ancla (Venue X). Los promotores ven sus primeros pagos instantáneos. Objetivo: 40% de uso de flota e ingresos por alquiler.',
      'roadmap.phase_3_title': 'Activación VIP y escala',
      'roadmap.phase_3_desc': 'Posicionar la bici como "La única forma de llegar". Ampliar a más locales. Las comisiones del 2,5% crecen con el volumen de entradas.',
      'roadmap.phase_4_title': 'Optimización y rentabilidad',
      'roadmap.phase_4_desc': 'Usar GPS y datos de locales para optimizar colocación de bicis. Objetivo 75% de uso. Alcanzar <strong>punto de equilibrio operativo</strong> y flujo de caja positivo.',
      'roadmap.in_progress': 'En curso',
      'roadmap.todo': 'Por hacer',
      'roadmap.phase_1_item1': 'Alcance de flota y branding',
      'roadmap.phase_1_item2': 'Incorporar primeros 20 promotores A-List',
      'roadmap.phase_1_item3': 'Motor de pago activo en local piloto',
      'roadmap.phase_2_item1': 'Integración completa con 2 locales ancla',
      'roadmap.phase_2_item2': 'Onboarding de wallet de promotores completo',
      'roadmap.phase_2_item3': 'Alcanzar 40% de uso de flota en fin de semana',
      'roadmap.phase_3_item1': 'Campaña VIP en marcha',
      'roadmap.phase_3_item2': 'Más locales integrados',
      'roadmap.phase_3_item3': 'Volumen de transacciones en escala',
      'roadmap.phase_4_item1': 'Colocación y rutas basadas en datos',
      'roadmap.phase_4_item2': 'Objetivo 75% de uso de flota',
      'roadmap.phase_4_item3': 'OpEx mensual cubierto; resultado neto positivo',
      'roadmap.outro': 'Siguiente paso: acuerdos con socios y despliegue del panel para alertas de llegada VIP. <a href="#contact" class="roadmap-link">Contáctanos</a> para integración o inversión.',
      'roadmap.investor_intro': '<strong>Ruta de 4 meses a rentabilidad:</strong> Mes 1 — Flota y branding, incorporar top 20 promotores, motor de pago. Mes 2 — Puesta en marcha en 2 locales ancla, 40% uso. Mes 3 — Escalar a más locales, 2,5% de volumen. Mes 4 — 75% uso, equilibrio operativo, <strong>flujo de caja neto positivo</strong>. Estamos en Fase 1. <a href="#contact" class="roadmap-link">Contacto para deck y condiciones</a>.',
      'roadmap.weeks_1_4': 'Semanas 1–4',
      'roadmap.weeks_5_8': 'Semanas 5–8 · Mes 2',
      'roadmap.weeks_9_12': 'Semanas 9–12 · Mes 3',
      'roadmap.weeks_13_16': 'Semanas 13–16 · Mes 4',
      'roadmap.phase_num_1': 'Fase 1',
      'roadmap.phase_num_2': 'Fase 2',
      'roadmap.phase_num_3': 'Fase 3',
      'roadmap.phase_num_4': 'Fase 4',
      'experience.lead': 'La bici híbrida de marca Prestix.vip es tu <strong>llave VIP</strong> a locales asociados. Desde que reservas, no solo vas de A a B: entras en un viaje donde reconocimiento, acceso y pertenencia están incluidos. Así funciona y por qué ofrece una experiencia que va más allá de lo que solo el dinero puede comprar.',
      'experience.recognition_title': 'Reconocimiento VIP automatizado',
      'experience.recognition_p1': 'Cuando te acercas a un local asociado en la bici rastreada por la app, el sistema sabe que llegas. El personal recibe alertas en tiempo real y puede preparar una <strong>mesa reservada</strong> y una bienvenida personalizada—sin nombres, sin esperar en puerta.',
      'experience.recognition_p2': 'No se trata de comprar mesa; se trata de ser <strong>esperado</strong>. La metodología funciona porque el local está incentivado por la liquidación instantánea a tratar cada llegada Prestix.vip como prioridad. Obtienes el reconocimiento que antes requería relaciones o suerte—ahora está en el producto. Resultado: entras como habitual, no como extraño.',
      'experience.perks_title': 'Ventajas prioritarias',
      'experience.perks_p1': '<strong>Valet gratuito</strong> para la bici e <strong>entrada inmediata</strong>: saltas todas las colas. Eres recibido con la eficiencia que convierte la noche en un flujo impecable.',
      'experience.perks_p2': 'Ese flujo importa. Sin fricción, te centras en lo que importa: música, gente, conversación. Las ventajas prioritarias son la base de una <strong>experiencia 5 estrellas al instante</strong>. No pagas extra en puerta; ya lo has ganado con la bici. El sistema alinea tu comodidad con la claridad operativa del local.',
      'experience.settlement_title': 'Liquidación en tiempo real',
      'experience.settlement_p1': 'Se pueden comprar <strong>mesas o entradas</strong> con tarjeta, Apple Pay o <strong>cripto</strong>—incl. <strong>ETH</strong>, <strong>USDT</strong> y otros tokens. En segundo plano, el reparto es <strong>instantáneo</strong>: Promotor 10%, Marketplace 2,5%, Local 87,5%. Sin retraso de 7–30 días; todos cobran en el punto de venta.',
      'experience.settlement_p2': '¿Por qué mejora tu experiencia? Porque la liquidación instantánea alinea incentivos. El promotor y el local están motivados para que tu visita sea impecable; su ingreso ya está asegurado. Entras a un servicio más fluido y un local preparado para recibirte.',
      'experience.compliance_title': 'Seguridad, privacidad y cumplimiento',
      'experience.compliance_p': 'Pagos y datos cumplen los más altos estándares de <strong>seguridad y privacidad</strong>. La plataforma <strong>cumple la normativa local</strong> en cada mercado—pagues con tarjeta o cripto, tu transacción es segura y conforme.',
      'experience.why_title': 'Por qué funciona esta metodología: más allá del dinero',
      'experience.why_p1': 'Las mejores noches no son las que solo pagas—son aquellas en las que eres <strong>reconocido</strong>, <strong>incluido</strong> y rodeado de quien comparte el mismo estándar. Prestix.vip está diseñado para eso.',
      'experience.why_p2': '<strong>Entretenimiento que el dinero no puede comprar:</strong> No puedes comprar el momento en que te reciben por nombre ni la sensación de ir directo a tu mesa. Esos momentos vienen de un sistema que trata tu llegada como un evento, no una transacción. La bici es la señal; la plataforma y los socios hacen el resto.',
      'experience.why_p3': '<strong>Conectar con gente afín:</strong> Quien elige la bici Prestix.vip comparte el mismo camino: movilidad premium, locales asociados y una noche sin fricción. Estás en salas con gente que valora la experiencia. Ese filtro natural aumenta la probabilidad de conexión real.',
      'experience.why_p4': '<strong>Experiencia 5 estrellas al instante:</strong> Sin vouchers ni "estoy en la lista" en la puerta. De bici a mesa, la experiencia es continua. Ya estás en el nivel que recibe el mejor trato. Ese es el núcleo de la metodología.',
      'experience.why_p5': 'Alquilar la bici no es solo transporte—es un <strong>pase de acceso total</strong> a reconocimiento, prioridad y una sala de gente que espera lo mismo. Ese es el futuro de la hospitalidad que construimos.',
      'contact.name_placeholder': 'Nombre',
      'contact.email_placeholder': 'Email*',
      'contact.message_placeholder': 'Mensaje',
      'account.title': 'Cuenta',
      'account.signin_title': 'Registrarse / Iniciar sesión',
      'account.signin_text': 'Inicia sesión con Google para gestionar tu perfil, preferencias y notificaciones de Prestix.vip.',
      'account.continue_google': 'Continuar con Google',
      'account.account_data': 'Datos de la cuenta',
      'account.sign_out': 'Cerrar sesión',
      'account.preferences_title': 'Preferencias',
      'account.preferences_text': 'Indica tu rol y preferencias para clasificar tu perfil y personalizar la app y los servicios. Tus elecciones se guardan y se usan en toda tu experiencia.',
      'account.notifications_title': 'Notificaciones',
      'account.notifications_text': 'Elige cómo quieres recibir avisos del lanzamiento del marketplace y actualizaciones. Puedes activar notificaciones push o "Avisar al lanzar" desde el menú.',
      'drawer.account': 'Cuenta',
      'drawer.account_data': 'Datos de la cuenta',
      'drawer.theme_language': 'Tema e idioma',
      'drawer.not_signed_in': 'Sin sesión',
      'drawer.sign_out': 'Cerrar sesión',
      'drawer.select_profile': 'Bienvenido a Prestix.vip. Construyamos algo grande.',
      'drawer.select_profile_text': 'Ayúdanos a personalizar tu experiencia respondiendo un momento a las preguntas siguientes.',
      'drawer.benefits_for_profile': 'Beneficios para tu perfil',
      'drawer.back': 'Atrás',
      'drawer.cancel': 'Cancelar',
      'drawer.next': 'Siguiente',
      'drawer.done': 'Listo',
      'drawer.save': 'Guardar',
      'drawer.profile_overview': 'Resumen del perfil',
      'drawer.step_of': 'Paso {n} de 9',
      'drawer.mission': 'Misión',
      'drawer.mission_text': 'Hub de Promotores integral para Venues, Organizadores de Eventos y Promotores. Una plataforma para todas las necesidades promocionales—pagos al instante, un panel, acceso VIP.',
      'drawer.platform': 'Plataforma',
      'drawer.platform_text': 'Un mercado justo con operaciones simplificadas y valor transparente para locales y promotores.',
      'drawer.value': 'Valor',
      'drawer.value_text': 'Qué obtienes: liquidación al instante, economía clara y un único panel para tus operaciones.',
      'drawer.venues': 'Locales',
      'drawer.venues_text': 'Locales asociados y cómo nos integramos con ubicaciones premium en tu mercado.',
      'drawer.roadmap': 'Hoja de ruta',
      'drawer.roadmap_text': 'Calendario de lanzamiento y próximos pasos del marketplace y la flota.',
      'drawer.experience': 'Experiencia',
      'drawer.experience_text': 'La experiencia VIP: reconocimiento, mesas dedicadas y entrada fluida en locales asociados.',
      'drawer.feedback': 'Opiniones',
      'drawer.feedback_text': 'Lo que dicen los primeros socios y patrones sobre Prestix.vip.',
      'drawer.contact': 'Contacto y ser socio',
      'drawer.pitch': 'Presentación para inversores',
      'nav.section_pitch': 'Pitch',
      'drawer.contact_text': 'Ponte en contacto para unirte como promotor o socio de local. Te guiaremos en los siguientes pasos.',
      'drawer.go_mission': 'Ir a Misión',
      'drawer.go_platform': 'Ir a Plataforma',
      'drawer.go_value': 'Ir a Valor',
      'drawer.go_venues': 'Ir a Locales',
      'drawer.go_roadmap': 'Ir a Hoja de ruta',
      'drawer.go_experience': 'Ir a Experiencia',
      'drawer.go_feedback': 'Ir a Opiniones',
      'drawer.go_contact': 'Ir a Contacto',
      'feedback.question': '¿Alquilarías la bici?',
      'feedback.yes': 'Sí',
      'feedback.no': 'No',
      'feedback.comment_placeholder': 'Comentario (opcional)',
      'feedback.submit': 'Enviar respuesta',
      'feedback.thanks': 'Gracias por tu opinión.',
      'contact.send': 'ENVIAR',
      'contact.newsletter': 'Apúntate a nuestra lista de correo para novedades, promociones y más.',
      'account.field_email': 'correo',
      'account.field_name': 'nombre',
      'account.field_image': 'imagen',
      'account.nda_accepted': 'NDA aceptado',
      'account.nda_yes': 'Sí',
      'account.nda_no': 'No',
      'account.signed_in': 'Conectado',
      'search.no_matches': 'Sin resultados',
      'contact.sending': 'Enviando…',
      'contact.thanks_message': 'Gracias por tu mensaje. Nos pondremos en contacto.',
      'contact.error_generic': 'Algo salió mal. Intenta de nuevo o escribe a soporte.',
      'nav.section_landing': 'Inicio',
      'nav.section_account': 'Cuenta',
      'nav.section_settings': 'Ajustes',
      'profile.completion': 'Perfil {p}% completo',
      'profile.status_complete': '{p}% Completo',
      'profile.name': 'Nombre',
      'profile.email': 'Correo',
      'profile.company_or_handle': 'Empresa o identificador social',
      'profile.event_types': 'Tipos de eventos que promocionas',
      'profile.volume': 'Volumen esperado (opcional)',
      'profile.venue_name': 'Nombre del local',
      'profile.role_at_venue': 'Tu rol en el local',
      'profile.market': 'Mercado / ciudad (opcional)',
      'profile.investment_focus': 'Enfoque de inversión (opcional)',
      'profile.contact_preference': 'Método de contacto preferido',
      'profile.how_heard': '¿Cómo nos conociste?',
      'profile.comments': 'Comentarios adicionales (opcional)',
      'profile.event_nightlife': 'Vida nocturna',
      'profile.event_concerts': 'Conciertos',
      'profile.event_private': 'Eventos privados',
      'profile.event_corporate': 'Eventos corporativos',
      'profile.event_festivals': 'Festivales',
      'profile.event_sports': 'Deportes',
      'profile.event_other': 'Otro',
      'profile.volume_under_50': 'Menos de 50 / mes',
      'profile.volume_50_200': '50–200 / mes',
      'profile.volume_200_500': '200–500 / mes',
      'profile.volume_500_plus': '500+ / mes',
      'profile.volume_prefer_not': 'Prefiero no decir',
      'profile.role_gm': 'Gerente general',
      'profile.role_owner': 'Propietario',
      'profile.role_events_manager': 'Gerente de eventos',
      'profile.role_marketing': 'Marketing',
      'profile.role_other': 'Otro',
      'profile.how_social': 'Redes sociales',
      'profile.how_referral': 'Referido',
      'profile.how_online_ad': 'Publicidad en línea',
      'profile.how_event': 'Evento',
      'profile.how_search': 'Búsqueda',
      'profile.how_other': 'Otro',
      'profile.save': 'Guardar perfil',
      'profile.saved_local': 'Perfil guardado localmente.',
      'profile.saved_uploaded': 'Perfil guardado y enviado al equipo.',
      'profile.save_failed': 'No se pudo guardar. Inténtalo de nuevo.',
      'questions.q1.promoter.title': '¿Qué te interesa más?',
      'questions.q1.partner.title': '¿Qué te interesa más?',
      'questions.q1.marketplace.title': '¿Qué te interesa más?',
      'questions.q2.promoter.title': 'Tipos de eventos que promocionas',
      'questions.q2.partner.title': 'Tu rol en el local',
      'questions.q2.marketplace.title': '¿Cómo nos conociste?',
      'questions.q3.promoter.title': 'Volumen esperado (opcional)',
      'questions.q3.partner.title': 'Mercado / ciudad',
      'questions.q3.marketplace.title': '¿Algún comentario?',
      'questions.q4.promoter.title': '¿Cómo nos conociste?',
      'questions.q4.partner.title': 'Capacidad o tipo de local',
      'questions.q4.marketplace.title': '¿Algo más que debamos saber?',
      'questions.q5.promoter.title': 'Método de contacto preferido',
      'questions.q5.partner.title': 'Método de contacto preferido',
      'questions.q5.marketplace.title': 'Forma preferida de mantenerse actualizado',
      'questions.q5.contact_email_label': 'Correo electrónico',
      'questions.q5.contact_email_placeholder': 'Tu correo',
      'questions.q5.contact_whatsapp_label': 'Número de WhatsApp',
      'questions.q5.contact_whatsapp_placeholder': 'Número con código de país',
      'questions.q5.contact_call_label': 'Número de teléfono',
      'questions.q5.contact_call_placeholder': 'Número de teléfono',
      'questions.q5.contact_other_label': 'Especificar',
      'questions.q5.contact_other_placeholder': '¿Cómo deberíamos contactarte?',
      'questions.q6.promoter.title': 'Mercados o ciudades objetivo',
      'questions.q6.partner.title': 'Cronograma de integración',
      'questions.q6.marketplace.title': '¿Algo más?',
      'questions.q7.promoter.title': 'Experiencia actual como promotor',
      'questions.q7.partner.title': 'Información adicional sobre tu local',
      'questions.q7.marketplace.title': '¿Algo más?',
      'questions.q8.promoter.title': 'Comentarios adicionales',
      'questions.q8.partner.title': 'Comentarios adicionales',
      'questions.q8.marketplace.title': 'Comentarios adicionales',
      'questions.opt_empty': '—',
      'questions.opt_other': 'Otro',
      'questions.opt_interest_commission': 'Comisión y pagos instantáneos',
      'questions.opt_interest_events': 'Tipos de eventos que puedo promocionar',
      'questions.opt_interest_getting_started': 'Cómo empezar',
      'questions.opt_interest_volume': 'Volumen y escalabilidad',
      'questions.opt_interest_onboarding': 'Proceso de incorporación de promotores',
      'questions.opt_interest_integrate': 'Cómo integrar nuestro local',
      'questions.opt_interest_dashboard': 'Panel y pagos instantáneos',
      'questions.opt_interest_vip_alerts': 'Alertas VIP y reconocimiento',
      'questions.opt_interest_roi': 'ROI y economía unitaria',
      'questions.opt_interest_vip': 'Acceso VIP y reconocimiento',
      'questions.opt_interest_booking': 'Reservar la bicicleta y mesas',
      'questions.opt_interest_venues': 'Locales asociados y experiencia',
      'questions.opt_contact_email': 'Correo',
      'questions.opt_contact_call': 'Llamada',
      'questions.opt_contact_whatsapp': 'WhatsApp',
      'questions.opt_timeline_asap': 'Lo antes posible',
      'questions.opt_timeline_1_3': '1–3 meses',
      'questions.opt_timeline_3_6': '3–6 meses',
      'questions.opt_timeline_exploring': 'Solo explorando',
      'questions.opt_venue_nightclub': 'Discoteca',
      'questions.opt_venue_restaurant': 'Restaurante',
      'questions.opt_venue_bar': 'Bar',
      'questions.opt_venue_event_space': 'Espacio para eventos',
    },
    fr: {
      'settings.title': 'Paramètres',
      'settings.theme': 'Thème',
      'settings.theme_desc': 'Choisissez l\'apparence claire ou sombre.',
      'settings.theme_dark': 'Sombre',
      'settings.theme_light': 'Clair',
      'settings.language': 'Langue',
      'settings.language_desc': 'Votre choix s\'applique à l\'ensemble du site, y compris cette page Paramètres. Toutes les étiquettes et le contenu s\'afficheront dans la langue sélectionnée.',
      'settings.admin': 'Administration',
      'settings.admin_export_desc': 'Télécharger tous les profils utilisateur soumis en fichier Excel. Le fichier contient une feuille « Tous les utilisateurs » et une feuille par utilisateur.',
      'settings.download_all_users': 'Télécharger toutes les données utilisateurs',
      'settings.admin_feedback_export_desc': 'Télécharger les réponses à « Loueriez-vous le vélo ? » (Oui/Non) en fichier Excel.',
      'settings.download_question_data': 'Télécharger les données des questions',
      'users.title': 'Gestion des utilisateurs',
      'users.desc': 'Gérer les utilisateurs connectés et attribuer le rôle administrateur.',
      'users.drawer_title': 'Gestion des utilisateurs',
      'users.manage': 'Gérer les utilisateurs',
      'nda.title': 'Accord de confidentialité',
      'nda.text': 'Les informations de ce site (modèles économiques, données financières, feuilles de route, détails produits) sont confidentielles et réservées aux investisseurs et partenaires qualifiés. En accédant à ce site, vous acceptez de ne pas les divulguer, reproduire ou utiliser sans consentement écrit préalable de Prestix.vip.',
      'nda.accept': 'Accepter NDA',
      'push.title': 'Soyez parmi les premiers',
      'push.text': 'Recevez une notification au lancement du marketplace Prestix.vip. Vous serez parmi les premiers à accéder à la plateforme.',
      'push.close': 'Fermer',
      'signin.title': 'Connexion ou inscription',
      'signin.text': 'Utilisez votre compte Google ou e-mail et mot de passe pour continuer.',
      'signin.continue_google': 'Continuer avec Google',
      'signin.or': 'ou',
      'signin.tab_signin': 'Connexion',
      'signin.tab_signup': 'Inscription',
      'signin.skip': 'Passer pour l\'instant',
      'header.search': 'Rechercher…',
      'hero.tagline': 'Promouvez et gagnez.',
      'hero.tagline_promoter': 'Promouvez et gagnez.',
      'hero.tagline_partner': 'Optimisez et scalez.',
      'hero.tagline_organizer': 'Organisez et réglez.',
      'hero.choose_experience': 'Choisissez votre expérience pour voir le contenu pertinent',
      'hero.subline': 'Donner aux promoteurs d\'événements les moyens de tisser des relations plus solides, toucher des audiences et promouvoir des événements.',
      'hero.benefit': 'Hub Promoters tout-en-un pour Venues, Organisateurs d\'événements & Promoters.',
      'hero.benefit_promoter': 'Répartition des paiements instantanée et automatisée. La place de marché simplifie vos opérations promotionnelles.',
      'hero.benefit_partner': 'Un tableau de bord pour gérer les promoteurs, suivre les performances et scaler votre lieu. Paiements instantanés, alertes VIP, classement des promoteurs.',
      'hero.benefit_organizer': 'Organisez des événements avec règlement instantané. Fixez le pourcentage de promotion de votre événement pour attirer plus de promoteurs ; ciblez votre communauté avec des lignes directrices et des promotions ciblées vers des membres spécifiques.',
      'role.title': 'Comment utiliserez-vous Prestix.vip ?',
      'role.subtitle': 'Prestix.vip est avant tout un Hub Promoters — pour optimiser, gérer, suivre et scaler les opérations de promotion en lieux. Choisissez votre profil pour personnaliser l\'app et votre expérience.',
      'role.all': 'Tous',
      'role.all_desc': 'Vue d\'ensemble pour lieux, organisateurs d\'événements et promoteurs.',
      'role.user': 'Utilisateur',
      'role.user_desc': 'Accès VIP, reconnaissance, zéro friction dans les lieux partenaires.',
      'role.promoter': 'Promoteur',
      'role.promoter_desc': 'Optimisez, gérez, suivez et scalez vos opérations de promotion en lieux. 10 % de commission, payée à l\'instant.',
      'role.partner': 'Partner',
      'role.partner_desc': 'Gérez les promoteurs, suivez les performances, scalez votre lieu. Un tableau de bord, paiements instantanés, alertes VIP.',
      'role.organizer': 'Organisateur d\'événements',
      'role.organizer_desc': 'Organisez des événements avec règlement instantané. Fixez le % de promotion, ciblez votre communauté avec des lignes directrices et des promotions ciblées vers des membres spécifiques.',
      'platform.for_organizers_heading': 'Pour les organisateurs d\'événements',
      'platform.for_organizers_text': 'Organisez des événements avec règlement instantané pour vous, votre lieu et les promoteurs. Une place de marché, un flux—billetterie, tables et paiements synchronisés. Fixez le pourcentage de promotion de votre événement pour attirer plus de promoteurs. Faites promouvoir par les promoteurs auprès de votre communauté : définissez des lignes directrices à respecter et lancez des promotions ciblées vers des membres spécifiques. Intégration avec les principaux fournisseurs ; tout le monde est payé au point de vente.',
      'role.marketplace': 'Utilisateur',
      'role.marketplace_desc': 'Accès VIP, reconnaissance, zéro friction dans les lieux partenaires.',
      'section.mission': 'La mission',
      'section.mission_sub': 'Un Hub Promoters tout-en-un — une plateforme pour Venues, Organisateurs d\'événements & Promoters. Prestix.vip',
      'section.platform': 'Marketplace',
      'section.platform_sub': 'Un marché équitable avec des opérations rationalisées et une valeur transparente pour tous',
      'section.venues': 'Partenariat pour les lieux',
      'section.venues_sub': 'Lieux partenaires et comment ils fonctionnent pour vous',
      'section.value': 'Valeur unique',
      'section.value_sub': 'Ce que vous gagnez',
      'section.roadmap': 'Feuille de route',
      'section.roadmap_sub': 'Où nous en sommes et la suite — chemin vers l\'équilibre opérationnel',
      'section.experience': 'Expérience VIP exclusive',
      'section.experience_sub': 'Louer le vélo, ce n\'est pas que du transport — c\'est un laissez-passer tout accès.',
      'section.contact': 'Nous contacter',
      'section.contact_sub': 'Laissez-nous un message !',
      'mission.all': 'Nous servons les <strong>Venues, Organisateurs d\'événements & Promoters</strong> avec un <strong>Hub Promoters tout-en-un</strong>—une plateforme pour tous les besoins promotionnels. En tant qu\'invité, le vélo est votre <strong>clé VIP</strong> vers les lieux partenaires : reconnaissance, tables dédiées et une expérience <strong>inestimable</strong>. En tant que promoter : <strong>moteur de paiement sans friction</strong>, commission au point de vente, aucun délai de 7 à 30 jours. En tant que venue ou organisateur : liquidité en temps réel, un tableau de bord et le contrôle total des dépenses promo et des arrivées VIP. Règlement instantané, paiements sans friction et un écosystème tech avec un chemin clair vers la rentabilité.',
      'mission.patron': 'Nous servons les <strong>Venues, Organisateurs d\'événements & Promoters</strong> avec un <strong>Hub Promoters tout-en-un</strong>—une plateforme pour tous les besoins promotionnels. En tant qu\'invité, le vélo est votre <strong>clé VIP</strong> vers les lieux partenaires : reconnaissance, tables dédiées et une expérience <strong>inestimable</strong>—sans name-dropping, sans attente.',
      'mission.promoter': 'Nous servons les <strong>Venues, Organisateurs d\'événements & Promoters</strong> avec un <strong>Hub Promoters tout-en-un</strong>—une plateforme pour tous vos besoins promotionnels. En tant que promoter, vous bénéficiez d\'un <strong>moteur de paiement sans friction</strong> : commission au point de vente, aucun délai de 7 à 30 jours.',
      'mission.management': 'Nous servons les <strong>Venues, Organisateurs d\'événements & Promoters</strong> avec un <strong>Hub Promoters tout-en-un</strong>—une plateforme pour tous les besoins promotionnels. En tant que venue ou organisateur, vous avez liquidité en temps réel, un tableau de bord et le contrôle total des dépenses promo et des arrivées VIP.',
      'mission.investor': 'PRESTIX.VIP est un <strong>Hub Promoters tout-en-un</strong> au service des <strong>Venues, Organisateurs d\'événements & Promoters</strong>—une plateforme pour tous les besoins promotionnels. Règlement instantané, paiements sans friction et un écosystème tech (flotte de marque, dashboard venue, outils promoters) avec un chemin clair vers la rentabilité.',
      'platform.lead': 'Prestix.vip donne aux promoteurs et aux lieux les outils et la clarté pour gérer les promos à grande échelle—sans suppositions, sans goulots d\'étranglement manuels, avec une visibilité claire sur qui génère du chiffre.',
      'platform.for_users_heading': 'Pour les utilisateurs',
      'platform.for_users_text': 'Votre clé VIP vers les lieux partenaires. Expérience premium, zéro friction—tables dédiées, reconnaissance instantanée, valet pour le vélo. Payez par carte, Apple Pay ou crypto. Le marketplace et la flotte de marque vous donnent le statut « Black Card » via la proximité GPS dans les lieux partenaires.',
      'platform.for_venues_heading': 'Pour les lieux',
      'platform.for_venues_text': 'Analyse et suivi promotionnel dans un tableau de bord, plus un classement des promoteurs pour voir qui performe. Validez les budgets promo et recevez des alertes en temps réel. Automatisation IA des workflows répétitifs, cohérence du service client et liens durables avec les clients—tout en réglant les promoteurs à l\'instant.',
      'platform.for_promoters_heading': 'Pour les promoteurs',
      'platform.for_promoters_text': 'Une place de marché équitable où la valeur que vous générez est claire et transparente. Votre commission est suivie et payée instantanément au point de vente—pas de boîtes noires ni de paiements retardés. Source unique de vérité pour que votre contribution soit visible et récompensée.',
      'platform.close': 'Nous nous intégrons à tous les grands fournisseurs de billets : la place peut être la source unique de vérité ou un intermédiaire qui automatise le partage de paiement instantané après achat. Les acheteurs peuvent payer tables et billets par <strong>carte, Apple Pay ou crypto (ETH, USDT, etc.)</strong>. Toutes les transactions respectent les plus hauts standards de <strong>sécurité et confidentialité</strong> et sont <strong>conformes à la réglementation locale</strong>. Avec la flotte hybride de marque, la place accorde aussi aux invités le statut <strong>« Black Card »</strong> via des alertes de proximité GPS dans les lieux partenaires.',
      'platform.investor': '<strong>Produit :</strong> Flotte de marque + place iOS avec réservation en temps réel et GPS. <strong>Modèle de revenus :</strong> 10 % promoteur / 2,5 % place / 87,5 % lieu, partage instantané. Carte, Apple Pay, crypto. <strong>Tableau de bord lieu :</strong> Centre de commande des arrivées, alertes de proximité, transparence financière. Évolutif dans tous les marchés.',
      'venues.patron': 'Les lieux partenaires Prestix.vip vous reconnaissent à l\'arrivée en vélo. Vous avez <strong>des tables dédiées</strong>, <strong>l\'entrée gratuite</strong> et <strong>le valet devant la maison</strong>. Pas de file, pas de liste—votre accès est inclus. Réservez sur la plateforme et présentez-vous ; le lieu est prêt.',
      'venues.promoter': 'Chaque vente sur le marketplace est validée et réglée <strong>instantanément</strong>—le lieu reçoit sa part, vous vos 10 %, la plateforme gère le partage en un flux. Pas de double réservation ni retard de paiement. Les lieux voient un classement des promoteurs et des alertes en temps réel.',
      'venues.management_lead': 'Nous nous intégrons à <strong>tous les principaux fournisseurs de billets</strong>. Chaque billet ou table réservé via la place est validé et disponible—que la place soit votre <strong>source unique de vérité</strong> ou que nous soyons l\'<strong>intermédiaire</strong> qui automatise le partage instantané à l\'achat. Le lieu est payé ; promoteurs et place sont réglés dans le même flux. Pas de double réservation ni retard.',
      'venues.benefit_1': 'Analyse et suivi promotionnel — Un tableau de bord. Voir quelles campagnes et promoteurs génèrent trafic et revenus.',
      'venues.benefit_2': 'Classement des promoteurs — Comparer les performances pour investir le budget où ça paie.',
      'venues.benefit_3': 'Valider le budget promotionnel — Suivi des dépenses et ROI en temps réel ; aligner les budgets sur les résultats.',
      'venues.benefit_4': 'Alertes en temps réel — Arrivées VIP, jalons de ventes et mises à jour opérationnelles pour agir immédiatement.',
      'venues.benefit_5': 'Cohérence du service client — Même niveau pour chaque invité ; la plateforme soutient le processus.',
      'venues.benefit_6': 'Créer des liens durables — Du premier contact aux visites répétées ; l\'expérience transforme les invités en habitués.',
      'venues.integrations_title': 'Fournisseurs de billets et intégration',
      'venues.integrations_intro': 'La place se connecte aux plateformes de billetterie via API et SDK quand disponible, pour garder stock et ventes synchronisés et règlement instantané dans votre stack.',
      'venues.integrations_note': 'D\'autres fournisseurs peuvent être intégrés sur mesure ; nous priorisons les plateformes avec APIs/SDKs publiques ou partenaires pour une synchro sécurisée en temps réel.',
      'venues.compliance_title': 'Options de paiement et conformité',
      'venues.compliance_text': 'Tables et billets peuvent être achetés par <strong>carte, Apple Pay ou crypto (ETH, USDT et autres jetons)</strong>. Nous mettons l\'accent sur <strong>sécurité et confidentialité de premier ordre</strong> ; la plateforme est <strong>conforme à la réglementation locale</strong> dans chaque marché.',
      'venues.close': 'Pour investisseurs et opérateurs : voici l\'utilité du partenariat—opérations promotionnelles simplifiées, valeur transparente et une place qui sécurise le stock et paie tout le monde à l\'instant.',
      'venues.investor': 'Intégration avec <strong>Eventbrite, Ticketmaster, DICE, See Tickets</strong>. Source unique de vérité ou intermédiaire pour partage instantané. Pas de double réservation ni retard. Tableau de bord : analyse promo, classement promoteurs, alertes d\'arrivée VIP (ex. 500 m). Conformité paiement et réglementaire dans tous les marchés.',
      'venues.onboarding_title': 'Onboarding venue — Devenir partenaire',
      'venues.onboarding_lead': 'Pour devenir partenaire Prestix.vip, un venue achète un partenariat. Cela donne au venue un accès complet à tous les outils de la plateforme et ouvre le marketplace pour que les processus opérationnels promotionnels actuels du partenaire soient intégrés au marketplace spécifiquement pour ce partenaire.',
      'venues.onboarding_privacy': 'Le partenaire peut choisir de garder tous les aspects de ses opérations actuelles en privé sur le marketplace, ou activer la section publique des opérations.',
      'venues.onboarding_fee': 'Frais de membership partenariat mensuel : 500 USD par mois.',
      'value.patron_h': 'Pour l\'invité',
      'value.patron_p': 'Le vélo est la <strong>clé</strong>. Tables dédiées, entrée gratuite et valet en lieux partenaires. Pas de file—reconnaissance incluse.',
      'value.promoter_h': 'Pour le promoteur',
      'value.promoter_p': '<strong>10 % de commission</strong> livrée à l\'instant au point de vente. Pas d\'attente 7–30 jours. Un tableau de bord, transparence totale.',
      'value.venue_h': 'Pour le lieu',
      'value.venue_p': '<strong>87,5 %</strong> de partage instantané. Analyse promo, classement promoteurs, alertes en temps réel. Arrivées VIP annoncées 500 m avant la porte. Intégration Eventbrite, Ticketmaster, DICE, See Tickets.',
      'value.investor_h': 'Résumé investisseur',
      'value.investor_p': '<strong>Viabilité :</strong> Marché 9/10, Modèle 8/10, Revenus 8/10, Avantage 9/10, Scalabilité 8/10. <strong>CAPEX :</strong> ~40 000 AUD. <strong>Revenus :</strong> location 60–80 AUD/événement ; 2,5 % de commission. <strong>Objectif 4 mois :</strong> seuil de rentabilité opérationnel à ~75 % d\'utilisation de flotte. Positionnement unique : règlement instantané + effet VIP.',
      'roadmap.intro': 'Nous déployons le vélo et l\'expérience Black Card dans les lieux partenaires. Prestix.vip exécute un <strong>plan de 4 mois</strong> de la fondation à la rentabilité. La chronologie ci-dessous montre les phases, la position actuelle et les jalons restants. <a href="#contact" class="roadmap-link">Contactez-nous</a> pour un accès anticipé ou une intégration.',
      'roadmap.patron_intro': 'Nous déployons le vélo et l\'expérience Black Card dans les lieux partenaires. Ensuite : plus de villes, plus de lieux et réservation fluide pour réserver vélo et table en un flux. <a href="#contact" class="roadmap-link">Contactez-nous</a> pour un accès anticipé.',
      'roadmap.promoter_intro': 'Prestix.vip exécute un <strong>plan de 4 mois</strong> de la fondation à la rentabilité. La chronologie ci-dessous montre les phases, la position actuelle et les jalons restants.',
      'roadmap.we_here': 'Nous en sommes ici',
      'roadmap.phase_1_title': 'Fondation et alignement de marque',
      'roadmap.phase_1_desc': 'Sécuriser la flotte ; finaliser le branding et les détails par lieu. Établir la liste « Promoteurs invités » et déployer le partage instantané (10 % / 2,5 % / 87,5 %).',
      'roadmap.phase_2_title': 'Lancement dans les lieux ancre',
      'roadmap.phase_2_desc': 'Mise en service dans 2 lieux ancre (Venue X). Les promoteurs voient leurs premiers paiements instantanés. Objectif : 40 % d\'utilisation de flotte et revenus de location.',
      'roadmap.phase_3_title': 'Activation VIP et scale',
      'roadmap.phase_3_desc': 'Positionner le vélo comme « La seule façon d\'arriver ». Étendre à d\'autres lieux. Les frais de 2,5 % augmentent avec le volume de billets.',
      'roadmap.phase_4_title': 'Optimisation et rentabilité',
      'roadmap.phase_4_desc': 'Utiliser GPS et données des lieux pour optimiser le placement des vélos. Objectif 75 % d\'utilisation. Atteindre le <strong>seuil de rentabilité opérationnel</strong> et une trésorerie nette positive.',
      'roadmap.in_progress': 'En cours',
      'roadmap.todo': 'À faire',
      'roadmap.phase_1_item1': 'Périmètre flotte et branding',
      'roadmap.phase_1_item2': 'Intégrer les 20 premiers promoteurs A-List',
      'roadmap.phase_1_item3': 'Moteur de paiement en place au lieu pilote',
      'roadmap.phase_2_item1': 'Intégration complète avec 2 lieux ancre',
      'roadmap.phase_2_item2': 'Onboarding wallet promoteurs terminé',
      'roadmap.phase_2_item3': 'Atteindre 40 % d\'utilisation de flotte le week-end',
      'roadmap.phase_3_item1': 'Campagne VIP en cours',
      'roadmap.phase_3_item2': 'Autres lieux intégrés',
      'roadmap.phase_3_item3': 'Volume de transactions en scale',
      'roadmap.phase_4_item1': 'Placement et itinéraires basés sur les données',
      'roadmap.phase_4_item2': 'Objectif 75 % d\'utilisation de flotte',
      'roadmap.phase_4_item3': 'OpEx mensuel couvert ; résultat net positif',
      'roadmap.outro': 'Prochaine étape : accords partenaires et déploiement du tableau de bord pour alertes d\'arrivée VIP. <a href="#contact" class="roadmap-link">Contactez-nous</a> pour intégration ou investissement.',
      'roadmap.investor_intro': '<strong>Chemin de 4 mois vers la rentabilité :</strong> Mois 1 — Flotte et branding, intégrer le top 20 promoteurs, moteur de paiement. Mois 2 — Mise en service dans 2 lieux ancre, 40 % utilisation. Mois 3 — Scale vers plus de lieux, 2,5 % de volume. Mois 4 — 75 % utilisation, seuil de rentabilité opérationnel, <strong>trésorerie nette positive</strong>. Nous sommes en Phase 1. <a href="#contact" class="roadmap-link">Contact pour deck et conditions</a>.',
      'roadmap.weeks_1_4': 'Semaines 1–4',
      'roadmap.weeks_5_8': 'Semaines 5–8 · Mois 2',
      'roadmap.weeks_9_12': 'Semaines 9–12 · Mois 3',
      'roadmap.weeks_13_16': 'Semaines 13–16 · Mois 4',
      'roadmap.phase_num_1': 'Phase 1',
      'roadmap.phase_num_2': 'Phase 2',
      'roadmap.phase_num_3': 'Phase 3',
      'roadmap.phase_num_4': 'Phase 4',
      'experience.lead': 'Le vélo hybride de marque Prestix.vip est votre <strong>clé VIP</strong> vers les lieux partenaires. Dès la réservation, ce n\'est pas seulement A à B—vous entrez dans un parcours où reconnaissance, accès et appartenance sont intégrés. Voici comment ça marche et pourquoi ça offre une expérience au-delà de ce que l\'argent seul peut acheter.',
      'experience.recognition_title': 'Reconnaissance VIP automatisée',
      'experience.recognition_p1': 'Quand vous approchez un lieu partenaire en vélo suivi par l\'app, le système sait que vous arrivez. Le personnel est alerté en temps réel et peut préparer une <strong>table dédiée</strong> et un accueil personnalisé—sans name-dropping, sans attente à la porte.',
      'experience.recognition_p2': 'Il ne s\'agit pas d\'acheter une table ; il s\'agit d\'être <strong>attendu</strong>. La méthodologie fonctionne car le lieu est incité par le règlement instantané à traiter chaque arrivée Prestix.vip en priorité. Vous obtenez la reconnaissance qui exigeait relations ou chance—maintenant intégrée au produit. Résultat : vous entrez comme habitué, pas comme inconnu.',
      'experience.perks_title': 'Avantages prioritaires',
      'experience.perks_p1': '<strong>Valet gratuit</strong> pour le vélo et <strong>entrée immédiate</strong> : vous évitez toutes les files. Vous êtes accueilli avec l\'efficacité qui transforme la soirée en un flux fluide.',
      'experience.perks_p2': 'Ce flux compte. Sans friction, vous vous concentrez sur l\'essentiel : musique, foule, conversation. Les avantages prioritaires sont le socle d\'une <strong>expérience 5 étoiles instantanée</strong>. Vous ne payez pas plus à la porte—vous l\'avez déjà mérité avec le vélo. Le système aligne votre confort avec la clarté opérationnelle du lieu.',
      'experience.settlement_title': 'Règlement en temps réel',
      'experience.settlement_p1': 'Tables et billets peuvent être achetés par <strong>carte, Apple Pay ou crypto</strong>—dont <strong>ETH</strong>, <strong>USDT</strong> et autres jetons. En coulisses, le partage est <strong>instantané</strong> : Promoteur 10 %, Place 2,5 %, Lieu 87,5 %. Pas de délai 7–30 jours ; tout le monde est payé au point de vente.',
      'experience.settlement_p2': 'Pourquoi ça améliore votre expérience ? Parce que le règlement instantané aligne les incitations. Le promoteur et le lieu sont motivés pour une visite impeccable—leurs revenus sont déjà sécurisés. Vous ressentez la différence dans un service plus fluide et un lieu prêt à vous accueillir.',
      'experience.compliance_title': 'Sécurité, confidentialité et conformité',
      'experience.compliance_p': 'Paiements et données respectent les plus hauts standards de <strong>sécurité et confidentialité</strong>. La plateforme est <strong>conforme à la réglementation locale</strong> dans chaque marché—carte ou crypto, votre transaction est sécurisée et conforme.',
      'experience.why_title': 'Pourquoi cette méthodologie fonctionne : au-delà de l\'argent',
      'experience.why_p1': 'Les meilleures soirées ne sont pas celles que vous payez simplement—ce sont celles où vous êtes <strong>reconnu</strong>, <strong>inclus</strong> et entouré de gens qui partagent le même standard. Prestix.vip est conçu pour ça.',
      'experience.why_p2': '<strong>Divertissement que l\'argent ne peut pas acheter :</strong> Vous ne pouvez pas acheter le moment où l\'hôte vous appelle par votre nom, ni la sensation d\'aller droit à votre table. Ces moments viennent d\'un système qui traite votre arrivée comme un événement, pas une transaction. Le vélo est le signal ; la plateforme et les partenaires font le reste.',
      'experience.why_p3': '<strong>Se connecter avec des gens similaires :</strong> Chacun sur un vélo Prestix.vip a choisi le même chemin : mobilité premium, lieux partenaires et une soirée sans friction. Vous êtes dans des salles avec des gens qui valorisent l\'expérience. Ce filtre naturel augmente les chances de vraie connexion.',
      'experience.why_p4': '<strong>Expérience 5 étoiles instantanée :</strong> Pas de bons ni de « je suis sur la liste » à la porte. Du vélo à la table, l\'expérience est continue. Vous êtes déjà dans le niveau qui reçoit le meilleur traitement. C\'est le cœur de la méthodologie.',
      'experience.why_p5': 'Louer le vélo n\'est pas que du transport—c\'est un <strong>laissez-passer tout accès</strong> à la reconnaissance, la priorité et une salle de gens qui attendent la même chose. C\'est l\'avenir de l\'hospitalité que nous construisons.',
      'contact.name_placeholder': 'Nom',
      'contact.email_placeholder': 'Email*',
      'contact.message_placeholder': 'Message',
      'account.title': 'Compte',
      'account.signin_title': 'S\'inscrire / Se connecter',
      'account.signin_text': 'Connectez-vous avec Google pour gérer votre profil, préférences et notifications Prestix.vip.',
      'account.continue_google': 'Continuer avec Google',
      'account.account_data': 'Données du compte',
      'account.sign_out': 'Déconnexion',
      'account.preferences_title': 'Préférences',
      'account.preferences_text': 'Indiquez votre rôle et préférences pour classifier votre profil et personnaliser l\'app et les services. Vos choix sont enregistrés et utilisés dans toute votre expérience.',
      'account.notifications_title': 'Notifications',
      'account.notifications_text': 'Choisissez comment être notifié au lancement du marketplace et pour les mises à jour. Vous pouvez activer les notifications push ou « Notifier au lancement » depuis le menu.',
      'drawer.account': 'Compte',
      'drawer.account_data': 'Données du compte',
      'drawer.theme_language': 'Thème et langue',
      'drawer.not_signed_in': 'Non connecté',
      'drawer.sign_out': 'Déconnexion',
      'drawer.select_profile': 'Bienvenue sur Prestix.vip. Construisons quelque chose de grand.',
      'drawer.select_profile_text': 'Aidez-nous à personnaliser votre expérience en prenant une minute pour répondre aux questions ci-dessous.',
      'drawer.benefits_for_profile': 'Bénéfices pour votre profil',
      'drawer.back': 'Retour',
      'drawer.cancel': 'Annuler',
      'drawer.next': 'Suivant',
      'drawer.done': 'Terminé',
      'drawer.save': 'Enregistrer',
      'drawer.profile_overview': 'Aperçu du profil',
      'drawer.step_of': 'Étape {n} sur 9',
      'drawer.mission': 'Mission',
      'drawer.mission_text': 'Hub Promoters tout-en-un pour Venues, Organisateurs d\'événements & Promoters. Une plateforme pour tous les besoins promotionnels—paiements instantanés, un dashboard, accès VIP.',
      'drawer.platform': 'Plateforme',
      'drawer.platform_text': 'Un marché équitable avec des opérations rationalisées et une valeur transparente pour les lieux et promoteurs.',
      'drawer.value': 'Valeur',
      'drawer.value_text': 'Ce que vous obtenez : règlement instantané, économie claire et un tableau de bord unique pour vos opérations.',
      'drawer.venues': 'Lieux',
      'drawer.venues_text': 'Lieux partenaires et comment nous nous intégrons aux emplacements premium de votre marché.',
      'drawer.roadmap': 'Feuille de route',
      'drawer.roadmap_text': 'Calendrier de lancement et prochaines étapes pour le marketplace et la flotte.',
      'drawer.experience': 'Expérience',
      'drawer.experience_text': 'L\'expérience VIP : reconnaissance, tables dédiées et entrée fluide dans les lieux partenaires.',
      'drawer.feedback': 'Avis',
      'drawer.feedback_text': 'Ce que disent les premiers partenaires et clients sur Prestix.vip.',
      'drawer.contact': 'Contact et devenir partenaire',
      'drawer.pitch': 'Pitch investisseurs',
      'nav.section_pitch': 'Pitch',
      'drawer.contact_text': 'Contactez-nous pour rejoindre en tant que promoteur ou partenaire de lieu. Nous vous guiderons pour les prochaines étapes.',
      'drawer.go_mission': 'Aller à Mission',
      'drawer.go_platform': 'Aller à Plateforme',
      'drawer.go_value': 'Aller à Valeur',
      'drawer.go_venues': 'Aller à Lieux',
      'drawer.go_roadmap': 'Aller à Feuille de route',
      'drawer.go_experience': 'Aller à Expérience',
      'drawer.go_feedback': 'Aller à Avis',
      'drawer.go_contact': 'Aller à Contact',
      'feedback.question': 'Loueriez-vous le vélo ?',
      'feedback.yes': 'Oui',
      'feedback.no': 'Non',
      'feedback.comment_placeholder': 'Commentaire (optionnel)',
      'feedback.submit': 'Envoyer la réponse',
      'feedback.thanks': 'Merci pour votre avis.',
      'contact.send': 'ENVOYER',
      'contact.newsletter': 'Inscrivez-vous à notre liste pour des actualités, promos et plus.',
      'account.field_email': 'e-mail',
      'account.field_name': 'nom',
      'account.field_image': 'image',
      'account.nda_accepted': 'NDA accepté',
      'account.nda_yes': 'Oui',
      'account.nda_no': 'Non',
      'account.signed_in': 'Connecté',
      'search.no_matches': 'Aucun résultat',
      'contact.sending': 'Envoi en cours…',
      'contact.thanks_message': 'Merci pour votre message. Nous vous recontacterons.',
      'contact.error_generic': 'Une erreur s\'est produite. Réessayez ou contactez le support.',
      'nav.section_landing': 'Accueil',
      'nav.section_account': 'Compte',
      'nav.section_settings': 'Paramètres',
      'profile.completion': 'Profil {p}% complété',
      'profile.status_complete': '{p}% Terminé',
      'profile.name': 'Nom',
      'profile.email': 'Email',
      'profile.company_or_handle': 'Société ou identifiant social',
      'profile.event_types': 'Types d\'événements que vous promouvez',
      'profile.volume': 'Volume attendu (optionnel)',
      'profile.venue_name': 'Nom du lieu',
      'profile.role_at_venue': 'Votre rôle au lieu',
      'profile.market': 'Marché / ville (optionnel)',
      'profile.investment_focus': 'Focus d\'investissement (optionnel)',
      'profile.contact_preference': 'Méthode de contact préférée',
      'profile.how_heard': 'Comment nous avez-vous connu ?',
      'profile.comments': 'Commentaires additionnels (optionnel)',
      'profile.event_nightlife': 'Vie nocturne',
      'profile.event_concerts': 'Concerts',
      'profile.event_private': 'Événements privés',
      'profile.event_corporate': 'Événements d\'entreprise',
      'profile.event_festivals': 'Festivals',
      'profile.event_sports': 'Sport',
      'profile.event_other': 'Autre',
      'profile.volume_under_50': 'Moins de 50 / mois',
      'profile.volume_50_200': '50–200 / mois',
      'profile.volume_200_500': '200–500 / mois',
      'profile.volume_500_plus': '500+ / mois',
      'profile.volume_prefer_not': 'Préfère ne pas dire',
      'profile.role_gm': 'Directeur général',
      'profile.role_owner': 'Propriétaire',
      'profile.role_events_manager': 'Responsable d\'événements',
      'profile.role_marketing': 'Marketing',
      'profile.role_other': 'Autre',
      'profile.how_social': 'Réseaux sociaux',
      'profile.how_referral': 'Recommandation',
      'profile.how_online_ad': 'Publicité en ligne',
      'profile.how_event': 'Événement',
      'profile.how_search': 'Recherche',
      'profile.how_other': 'Autre',
      'profile.save': 'Enregistrer le profil',
      'profile.saved_local': 'Profil enregistré localement.',
      'profile.saved_uploaded': 'Profil enregistré et envoyé à l\'équipe.',
      'profile.save_failed': 'Échec de la sauvegarde. Réessayez.',
      'questions.q1.promoter.title': 'Qu\'est-ce qui vous intéresse le plus ?',
      'questions.q1.partner.title': 'Qu\'est-ce qui vous intéresse le plus ?',
      'questions.q1.marketplace.title': 'Qu\'est-ce qui vous intéresse le plus ?',
      'questions.q2.promoter.title': 'Types d\'événements que vous promouvez',
      'questions.q2.partner.title': 'Votre rôle au lieu',
      'questions.q2.marketplace.title': 'Comment nous avez-vous connu ?',
      'questions.q3.promoter.title': 'Volume attendu (optionnel)',
      'questions.q3.partner.title': 'Marché / ville',
      'questions.q3.marketplace.title': 'Des commentaires ?',
      'questions.q4.promoter.title': 'Comment nous avez-vous connu ?',
      'questions.q4.partner.title': 'Capacité ou type de lieu',
      'questions.q4.marketplace.title': 'Autre chose que nous devrions savoir ?',
      'questions.q5.promoter.title': 'Méthode de contact préférée',
      'questions.q5.partner.title': 'Méthode de contact préférée',
      'questions.q5.marketplace.title': 'Façon préférée de rester informé',
      'questions.q5.contact_email_label': 'Adresse e-mail',
      'questions.q5.contact_email_placeholder': 'Votre e-mail',
      'questions.q5.contact_whatsapp_label': 'Numéro WhatsApp',
      'questions.q5.contact_whatsapp_placeholder': 'Numéro avec code pays',
      'questions.q5.contact_call_label': 'Numéro de téléphone',
      'questions.q5.contact_call_placeholder': 'Numéro de téléphone',
      'questions.q5.contact_other_label': 'Préciser',
      'questions.q5.contact_other_placeholder': 'Comment devons-nous vous contacter ?',
      'questions.q6.promoter.title': 'Marchés ou villes cibles',
      'questions.q6.partner.title': 'Calendrier d\'intégration',
      'questions.q6.marketplace.title': 'Autre chose ?',
      'questions.q7.promoter.title': 'Expérience actuelle de promoteur',
      'questions.q7.partner.title': 'Informations supplémentaires sur votre lieu',
      'questions.q7.marketplace.title': 'Autre chose ?',
      'questions.q8.promoter.title': 'Commentaires supplémentaires',
      'questions.q8.partner.title': 'Commentaires supplémentaires',
      'questions.q8.marketplace.title': 'Commentaires supplémentaires',
      'questions.opt_empty': '—',
      'questions.opt_other': 'Autre',
      'questions.opt_interest_commission': 'Commission et paiements instantanés',
      'questions.opt_interest_events': 'Types d\'événements que je peux promouvoir',
      'questions.opt_interest_getting_started': 'Démarrer',
      'questions.opt_interest_volume': 'Volume et mise à l\'échelle',
      'questions.opt_interest_onboarding': 'Processus d\'intégration des promoteurs',
      'questions.opt_interest_integrate': 'Comment intégrer notre lieu',
      'questions.opt_interest_dashboard': 'Tableau de bord et paiements instantanés',
      'questions.opt_interest_vip_alerts': 'Alertes VIP et reconnaissance',
      'questions.opt_interest_roi': 'ROI et économie unitaire',
      'questions.opt_interest_vip': 'Accès VIP et reconnaissance',
      'questions.opt_interest_booking': 'Réserver le vélo et les tables',
      'questions.opt_interest_venues': 'Lieux partenaires et expérience',
      'questions.opt_contact_email': 'Email',
      'questions.opt_contact_call': 'Appel',
      'questions.opt_contact_whatsapp': 'WhatsApp',
      'questions.opt_timeline_asap': 'Dès que possible',
      'questions.opt_timeline_1_3': '1–3 mois',
      'questions.opt_timeline_3_6': '3–6 mois',
      'questions.opt_timeline_exploring': 'Simple exploration',
      'questions.opt_venue_nightclub': 'Discothèque',
      'questions.opt_venue_restaurant': 'Restaurant',
      'questions.opt_venue_bar': 'Bar',
      'questions.opt_venue_event_space': 'Espace événementiel',
    },
    de: {
      'settings.title': 'Einstellungen',
      'settings.theme': 'Design',
      'settings.theme_desc': 'Hell oder dunkel wählen.',
      'settings.theme_dark': 'Dunkel',
      'settings.theme_light': 'Hell',
      'settings.language': 'Sprache',
      'settings.language_desc': 'Ihre Auswahl gilt für die gesamte Website, einschließlich dieser Einstellungsseite. Alle Beschriftungen und Inhalte werden in der gewählten Sprache angezeigt.',
      'settings.admin': 'Verwaltung',
      'settings.admin_export_desc': 'Alle eingereichten Benutzerprofile als Excel-Datei herunterladen. Die Datei enthält ein Blatt „Alle Benutzer“ und ein Blatt pro Benutzer.',
      'settings.download_all_users': 'Alle Benutzerdaten herunterladen',
      'settings.admin_feedback_export_desc': 'Antworten auf „Würden Sie das Rad mieten?“ (Ja/Nein) als Excel-Datei herunterladen.',
      'settings.download_question_data': 'Fragendaten herunterladen',
      'users.title': 'Benutzerverwaltung',
      'users.desc': 'Benutzer verwalten, die sich angemeldet haben, und Admin-Rolle zuweisen.',
      'users.drawer_title': 'Benutzerverwaltung',
      'users.manage': 'Benutzer verwalten',
      'nda.title': 'Vertraulichkeitsvereinbarung',
      'nda.text': 'Die Informationen auf dieser Website (Geschäftsmodelle, Finanzen, Roadmaps, Produktdetails) sind vertraulich und nur für qualifizierte Investoren und Partner bestimmt. Durch den Zugriff auf diese Website erklären Sie sich damit einverstanden, solche Informationen nicht ohne vorherige schriftliche Zustimmung von Prestix.vip offenzulegen, zu vervielfältigen oder zu nutzen.',
      'nda.accept': 'NDA akzeptieren',
      'push.title': 'Seien Sie unter den Ersten',
      'push.text': 'Erhalten Sie eine Benachrichtigung, wenn der Prestix.vip-Marktplatz startet. Sie gehören zu den Ersten mit Zugang zur Plattform.',
      'push.close': 'Schließen',
      'signin.title': 'Anmelden oder registrieren',
      'signin.text': 'Nutzen Sie Ihr Google-Konto oder E-Mail und Passwort, um fortzufahren.',
      'signin.continue_google': 'Mit Google fortfahren',
      'signin.or': 'oder',
      'signin.tab_signin': 'Anmelden',
      'signin.tab_signup': 'Registrieren',
      'signin.skip': 'Vorerst überspringen',
      'header.search': 'Suchen…',
      'hero.tagline': 'Bewerben & verdienen.',
      'hero.tagline_promoter': 'Bewerben & verdienen.',
      'hero.tagline_partner': 'Optimieren & skalieren.',
      'hero.tagline_organizer': 'Veranstalten & abrechnen.',
      'hero.choose_experience': 'Wählen Sie Ihre Erfahrung für relevante Inhalte',
      'hero.subline': 'Event-Promotern mehr Macht: stärkere Beziehungen aufbauen, Zielgruppen erreichen und Events promoten.',
      'hero.benefit': 'Inklusiver Promoters Hub für Venues, Event-Organisatoren & Promoter.',
      'hero.benefit_promoter': 'Sofortige, automatisierte Auszahlungsaufteilung. Der Marktplatz rationalisiert Ihre Promo-Abläufe.',
      'hero.benefit_partner': 'Ein Dashboard zum Verwalten von Promotern, Verfolgen der Performance und Skalieren Ihrer Location. Sofortauszahlungen, VIP-Alerts, Promoter-Rangliste.',
      'hero.benefit_organizer': 'Veranstalten Sie Events mit Sofortabrechnung. Setzen Sie den Promo-Prozentsatz für Ihr Event, um mehr Promoter zu gewinnen; zielen Sie auf Ihre Community mit Richtlinien und zielgerichteten Aktionen für bestimmte Mitglieder.',
      'role.title': 'Wie werden Sie Prestix.vip nutzen?',
      'role.subtitle': 'Prestix.vip ist in erster Linie ein Promoters Hub — zur Optimierung, Steuerung, Nachverfolgung und Skalierung der Venue-Promotion. Wählen Sie Ihr Profil zur Personalisierung der App und Ihres Erlebnisses.',
      'role.all': 'Alle',
      'role.all_desc': 'Überblick für Locations, Veranstalter und Promoter.',
      'role.user': 'Nutzer',
      'role.user_desc': 'VIP-Zugang, Anerkennung, keine Reibung in Partnerlocations.',
      'role.promoter': 'Promoter',
      'role.promoter_desc': 'Optimieren, verwalten, verfolgen und skalieren Sie Ihre Venue-Promotion. 10 % Provision, sofort ausgezahlt.',
      'role.partner': 'Partner',
      'role.partner_desc': 'Promoter verwalten, Performance verfolgen, Location skalieren. Ein Dashboard, Sofortauszahlungen, VIP-Alerts.',
      'role.organizer': 'Veranstalter',
      'role.organizer_desc': 'Veranstalten Sie Events mit Sofortabrechnung. Promo-% setzen, Community mit Richtlinien ansprechen und zielgerichtete Aktionen für bestimmte Mitglieder.',
      'platform.for_organizers_heading': 'Für Veranstalter',
      'platform.for_organizers_text': 'Veranstalten Sie Events mit Sofortabrechnung für Sie, Ihre Location und Promoter. Ein Marktplatz, ein Ablauf—Ticketing, Tische und Auszahlungen synchron. Setzen Sie den Promo-Prozentsatz für Ihr Event, um mehr Promoter zu gewinnen. Lassen Sie Promoter in Ihrer Community werben: legen Sie Richtlinien fest und führen Sie zielgerichtete Aktionen für bestimmte Mitglieder durch. Integration mit großen Anbietern; alle werden am Verkaufspunkt bezahlt.',
      'role.marketplace': 'Nutzer',
      'role.marketplace_desc': 'VIP-Zugang, Anerkennung, keine Reibung in Partnerlocations.',
      'section.mission': 'Die Mission',
      'section.mission_sub': 'Ein inklusiver Promoters Hub — eine Plattform für Venues, Event-Organisatoren & Promoter. Prestix.vip',
      'section.platform': 'Marketplace',
      'section.platform_sub': 'Ein fairer Marktplatz mit schlanken Abläufen und transparenter Wertschöpfung für alle',
      'section.venues': 'Partnerschaft für Locations',
      'section.venues_sub': 'Partnerlocations und wie sie für Sie funktionieren',
      'section.value': 'Einzigartiger Wert',
      'section.value_sub': 'Was Sie gewinnen',
      'section.roadmap': 'Roadmap',
      'section.roadmap_sub': 'Wo wir stehen und was als Nächstes kommt – Weg zur operativen Gewinnschwelle',
      'section.experience': 'Exklusives VIP-Erlebnis',
      'section.experience_sub': 'Ein Rad mieten ist mehr als Transport – es ist ein All-Access-Pass.',
      'section.contact': 'Kontakt',
      'section.contact_sub': 'Schreiben Sie uns!',
      'mission.all': 'Wir bedienen <strong>Venues, Event-Organisatoren & Promoter</strong> mit einem <strong>inklusiven Promoters Hub</strong>—eine Plattform für alle Promo-Bedürfnisse. Als Gast ist das Rad Ihr <strong>VIP-Schlüssel</strong> zu Partnerlocations: Anerkennung, reservierte Tische und ein <strong>unbezahlbares</strong> Erlebnis. Als Promoter: <strong>reibungslose Auszahlungsmaschine</strong>, Provision am Verkaufspunkt, keine 7–30 Tage Verzögerung. Als Venue oder Organisator: Liquidität in Echtzeit, ein Dashboard und volle Kontrolle über Promo-Ausgaben und VIP-Ankünfte. Sofortabrechnung, reibungslose Auszahlungen und ein tech-gestütztes Ökosystem mit klarem Weg zur Rentabilität.',
      'mission.patron': 'Wir bedienen <strong>Venues, Event-Organisatoren & Promoter</strong> mit einem <strong>inklusiven Promoters Hub</strong>—eine Plattform für alle Promo-Bedürfnisse. Als Gast ist das Rad Ihr <strong>VIP-Schlüssel</strong> zu Partnerlocations: Anerkennung, reservierte Tische und ein <strong>unbezahlbares</strong> Erlebnis—ohne Namensnennung, ohne Wartezeit.',
      'mission.promoter': 'Wir bedienen <strong>Venues, Event-Organisatoren & Promoter</strong> mit einem <strong>inklusiven Promoters Hub</strong>—eine Plattform für alle Ihre Promo-Bedürfnisse. Als Promoter erhalten Sie eine <strong>reibungslose Auszahlungsmaschine</strong>: Provision am Verkaufspunkt, keine 7–30 Tage Verzögerung.',
      'mission.management': 'Wir bedienen <strong>Venues, Event-Organisatoren & Promoter</strong> mit einem <strong>inklusiven Promoters Hub</strong>—eine Plattform für alle Promo-Bedürfnisse. Als Venue oder Organisator: Liquidität in Echtzeit, ein Dashboard und volle Kontrolle über Promo-Ausgaben und VIP-Ankünfte.',
      'mission.investor': 'PRESTIX.VIP ist ein <strong>inklusiver Promoters Hub</strong> für <strong>Venues, Event-Organisatoren & Promoter</strong>—eine Plattform für alle Promo-Bedürfnisse. Sofortabrechnung, reibungslose Auszahlungen und ein tech-gestütztes Ökosystem (Markenflotte, Venue-Dashboard, Promoter-Tools) mit klarem Weg zur Rentabilität.',
      'platform.lead': 'Prestix.vip gibt Promotern und Locations die Werkzeuge und Klarheit, um Promotions im großen Stil zu betreiben—ohne Rätselraten, ohne manuelle Engpässe und mit klarer Sicht, wer echtes Geschäft bringt.',
      'platform.for_users_heading': 'Für Nutzer',
      'platform.for_users_text': 'Ihr VIP-Schlüssel zu Partnerlocations. Premium-Erlebnis, keine Reibung—dedizierte Tische, sofortige Anerkennung, Valet für das Fahrrad. Bezahlen Sie mit Karte, Apple Pay oder Krypto. Marketplace und Markenflotte verleihen Ihnen den „Black Card“-Status per GPS-Nähe an Partnerlocations.',
      'platform.for_venues_heading': 'Für Locations',
      'platform.for_venues_text': 'Promo-Analyse und -Tracking in einem Dashboard, plus ein Promoter-Ranking, damit Sie sehen, wer Ergebnisse liefert. Promo-Budgets validieren und Echtzeit-Alerts erhalten. KI-Automatisierung wiederkehrender Abläufe, einheitlicher Kundenservice und dauerhafte Beziehungen zu Gästen—während Sie Promoter sofort abrechnen.',
      'platform.for_promoters_heading': 'Für Promoter',
      'platform.for_promoters_text': 'Ein fairer Marktplatz, auf dem der von Ihnen generierte Wert klar und transparent ist. Ihre Provision wird erfasst und am Verkaufspunkt sofort ausgezahlt—keine Blackbox, keine verzögerten Auszahlungen. Single Source of Truth, damit Ihr Beitrag sichtbar und belohnt wird.',
      'platform.close': 'Wir integrieren alle großen Ticket-Anbieter: Der Marktplatz kann die einzige Wahrheitsquelle sein oder ein Mittelsmann, der die Sofortaufteilung nach dem Kauf automatisiert. Käufer können Tische und Tickets mit <strong>Karte, Apple Pay oder Krypto (ETH, USDT usw.)</strong> bezahlen. Alle Transaktionen erfüllen höchste <strong>Sicherheits- und Datenschutzstandards</strong> und sind <strong>mit lokalen Gesetzen konform</strong>. Zusammen mit der Marken-Hybridflotte verleiht der Marktplatz Gästen per GPS-Näherungsalerts den <strong>„Black Card“</strong>-Status an Partnerlocations.',
      'platform.investor': '<strong>Produkt:</strong> Markenflotte + iOS-Marktplatz mit Echtzeit-Buchung und GPS. <strong>Umsatzmodell:</strong> 10 % Promoter / 2,5 % Marktplatz / 87,5 % Location Sofortaufteilung. Karte, Apple Pay, Krypto. <strong>Location-Dashboard:</strong> Live-Ankunftszentrale, Näherungsalerts, finanzielle Transparenz. Skalierbar über Premium-Locations in jedem Markt.',
      'venues.patron': 'Partner-Locations von Prestix.vip erkennen Sie bei Ankunft mit dem Rad. Sie erhalten <strong>eigene Tische</strong>, <strong>freien Eintritt</strong> und <strong>Valet vor dem Haus</strong>. Keine Warteschlange, keine Gästeliste—Ihr Zugang ist inklusive. Buchen Sie über die Plattform und erscheinen Sie; die Location ist bereit.',
      'venues.promoter': 'Jede Verkauf auf dem marketplace ist validiert und réglée <strong>instantanément</strong>—le lieu reçoit sa part, vous vos 10 %, la plateforme gère le partage en un flux. Pas de double réservation ni retard de paiement. Les lieux voient un classement des promoteurs et des alertes en temps réel.',
      'venues.management_lead': 'Wir integrieren uns mit <strong>allen großen Ticket-Drittanbietern</strong>. Jedes Ticket oder jeder Tisch über den Marktplatz ist validiert und verfügbar—ob der Marktplatz Ihre <strong>einzige Wahrheitsquelle</strong> ist oder wir als <strong>Vermittler</strong> die Sofortaufteilung beim Kauf automatisieren. Die Location wird bezahlt; Promoter und Marktplatz werden im gleichen Durchlauf abgerechnet. Keine Doppelbuchung, keine Verzögerung.',
      'venues.benefit_1': 'Promo-Analyse & Tracking — Ein Dashboard. Sehen, welche Kampagnen und Promoter Traffic und Umsatz bringen.',
      'venues.benefit_2': 'Promoter-Ranking — Leistung vergleichen, Budget dort einsetzen, wo es sich auszahlt.',
      'venues.benefit_3': 'Promo-Budget validieren — Ausgaben und ROI in Echtzeit; Budgets an Ergebnisse anpassen.',
      'venues.benefit_4': 'Echtzeit-Alerts — VIP-Ankünfte, Verkaufsmeilensteine und operative Updates zum sofortigen Handeln.',
      'venues.benefit_5': 'Konsistenter Kundenservice — Gleicher Standard für jeden Gast; die Plattform unterstützt den Prozess.',
      'venues.benefit_6': 'Dauerhafte Verbindungen — Vom ersten Kontakt bis zu wiederholten Besuchen; die Erfahrung macht Gäste zu Stammgästen.',
      'venues.integrations_title': 'Große Ticketanbieter & Integration',
      'venues.integrations_intro': 'Der Marktplatz verbindet sich mit führenden Ticketing-Plattformen per API und SDK wo verfügbar, damit Bestand und Verkäufe synchron bleiben und Sofortabrechnung in Ihrem Stack funktioniert.',
      'venues.integrations_note': 'Weitere Anbieter können per Custom-Integration unterstützt werden; wir priorisieren Plattformen mit öffentlichen oder Partner-APIs/SDKs für sichere Echtzeit-Sync.',
      'venues.compliance_title': 'Zahlungsoptionen & regulatorische Compliance',
      'venues.compliance_text': 'Tische und Tickets können mit <strong>Karte, Apple Pay oder Krypto (ETH, USDT und andere Tokens)</strong> gekauft werden. Wir legen Wert auf <strong>höchste Sicherheit und Datenschutz</strong>; die Plattform ist <strong>mit allen lokalen Gesetzen und Vorschriften konform</strong> in jedem Markt.',
      'venues.close': 'Für Investoren und Betreiber: Das ist der Nutzen der Partnerschaft—schlanke Promo-Abläufe, transparenter Wert und ein Marktplatz, der Bestand sichert und alle sofort bezahlt.',
      'venues.investor': 'Integration mit <strong>Eventbrite, Ticketmaster, DICE, See Tickets</strong>. Einzige Wahrheitsquelle oder Vermittler für Sofortaufteilung. Keine Doppelbuchung, keine Verzögerung. Dashboard: Promo-Analyse, Promoter-Ranking, Echtzeit-VIP-Ankunftsalerts (z. B. 500 m). Zahlungs- und Regulatorik-Compliance in allen Märkten.',
      'venues.onboarding_title': 'Venue-Onboarding — Partner werden',
      'venues.onboarding_lead': 'Um Prestix.vip-Partner zu werden, erwirbt ein Venue eine Partnerschaft. Das gibt dem Venue vollen Zugang zu allen Plattform-Funktionen und öffnet den Marktplatz, damit die aktuellen Promo-Prozesse des Partners speziell für diesen Partner in den Marktplatz integriert werden können.',
      'venues.onboarding_privacy': 'Der Partner kann wählen, alle Aspekte seiner aktuellen Abläufe privat im Marktplatz zu halten oder den öffentlichen Bereich der Abläufe zu aktivieren.',
      'venues.onboarding_fee': 'Monatliche Partnerschafts-Mitgliedsgebühr: 500 USD pro Monat.',
      'value.patron_h': 'Für den Gast',
      'value.patron_p': 'Das Rad ist der <strong>Schlüssel</strong>. Eigene Tische, freier Eintritt und Valet in Partner-Locations. Keine Schlange—Anerkennung inklusive.',
      'value.promoter_h': 'Für den Promoter',
      'value.promoter_p': '<strong>10 % Provision</strong> sofort am Verkaufspunkt. Keine 7–30 Tage Wartezeit. Ein Dashboard, volle Transparenz.',
      'value.venue_h': 'Für die Location',
      'value.venue_p': '<strong>87,5 %</strong> Sofortaufteilung. Promo-Analyse, Promoter-Ranking, Echtzeit-Alerts. VIP-Ankünfte 500 m vor der Tür angekündigt. Integration mit Eventbrite, Ticketmaster, DICE, See Tickets.',
      'value.investor_h': 'Investor-Zusammenfassung',
      'value.investor_p': '<strong>Machbarkeit:</strong> Markt 9/10, Modell 8/10, Umsatz 8/10, Vorteil 9/10, Skalierbarkeit 8/10. <strong>CAPEX:</strong> ~40.000 AUD. <strong>Umsatz:</strong> Miete 60–80 AUD/Event; 2,5 % Transaktionsgebühr. <strong>4-Monats-Ziel:</strong> operativer Break-even bei ~75 % Flottenauslastung. Einzigartige Position: Sofortabrechnung + VIP-Flywheel.',
      'roadmap.intro': 'Wir rollen das Rad und die Black-Card-Erfahrung in Partner-Locations aus. Prestix.vip führt einen <strong>4-Monats-Plan</strong> von der Grundlage bis zur Rentabilität aus. Die Zeitachse zeigt Phasen, aktuelle Position und offene Meilensteine. <a href="#contact" class="roadmap-link">Kontakt</a> für Early Access oder Integration.',
      'roadmap.patron_intro': 'Wir rollen das Rad und die Black-Card-Erfahrung in Partner-Locations aus. Als Nächstes: mehr Städte, mehr Locations und nahtlose Buchung, um Fahrt und Tisch in einem Durchlauf zu reservieren. <a href="#contact" class="roadmap-link">Kontakt</a> für Early Access.',
      'roadmap.promoter_intro': 'Prestix.vip führt einen <strong>4-Monats-Plan</strong> von der Grundlage bis zur Rentabilität aus. Die Zeitachse zeigt Phasen, aktuelle Position und offene Meilensteine.',
      'roadmap.we_here': 'Hier sind wir',
      'roadmap.phase_1_title': 'Grundlage & Markenausrichtung',
      'roadmap.phase_1_desc': 'Flotte sichern; venue-spezifisches Branding und Detail finalisieren. Liste „Eingeladene Promoter“ etablieren und Sofortaufteilung (10 % / 2,5 % / 87,5 %) ausrollen.',
      'roadmap.phase_2_title': 'Start an Anker-Locations',
      'roadmap.phase_2_desc': 'Go-Live an 2 Anker-Partner-Locations (Venue X). Promoter sehen ihre ersten Sofortauszahlungen. Ziel: 40 % Flottenauslastung und frühe Mietumsätze.',
      'roadmap.phase_3_title': 'VIP-Aktivierung & Skalierung',
      'roadmap.phase_3_desc': 'Das Rad als „Der einzige Weg anzukommen“ vermarkten. Ausweitung auf weitere Partner-Locations. 2,5 % Transaktionsgebühren wachsen mit dem Ticketvolumen.',
      'roadmap.phase_4_title': 'Optimierung & Rentabilität',
      'roadmap.phase_4_desc': 'GPS- und Venue-Daten für optimale Radplatzierung nutzen. Ziel 75 % Flottenauslastung. <strong>Operativen Break-even</strong> und positiven Cashflow erreichen.',
      'roadmap.in_progress': 'In Arbeit',
      'roadmap.todo': 'Zu erledigen',
      'roadmap.phase_1_item1': 'Flotte und Branding-Umfang',
      'roadmap.phase_1_item2': 'Erste 20 A-List-Promoter onboarden',
      'roadmap.phase_1_item3': 'Zahlungs-Engine live am Pilot-Venue',
      'roadmap.phase_2_item1': 'Vollintegration mit 2 Anker-Locations',
      'roadmap.phase_2_item2': 'Promoter-Wallet-Onboarding abgeschlossen',
      'roadmap.phase_2_item3': '40 % Wochenend-Flottenauslastung erreichen',
      'roadmap.phase_3_item1': 'VIP-Kampagne live',
      'roadmap.phase_3_item2': 'Weitere Locations integriert',
      'roadmap.phase_3_item3': 'Transaktionsvolumen skaliert',
      'roadmap.phase_4_item1': 'Datengetriebene Platzierung und Routing',
      'roadmap.phase_4_item2': 'Ziel 75 % Flottenauslastung',
      'roadmap.phase_4_item3': 'Monatliche OpEx gedeckt; netto positiv',
      'roadmap.outro': 'Nächster Schritt: Partnervereinbarungen und Rollout des Venue-Dashboards für VIP-Ankunftsalerts. <a href="#contact" class="roadmap-link">Kontakt</a> für Integration oder Investition.',
      'roadmap.investor_intro': '<strong>4-Monats-Pfad zur Rentabilität:</strong> Mo 1 — Flotte & Branding, Top-20-Promoter onboarden, Zahlungs-Engine. Mo 2 — Go-Live an 2 Anker-Locations, 40 % Auslastung. Mo 3 — Skalierung auf mehr Locations, 2,5 % Transaktionsvolumen wächst. Mo 4 — 75 % Auslastung, operativer Break-even, <strong>positiver Cashflow</strong>. Wir sind in Phase 1. <a href="#contact" class="roadmap-link">Kontakt für Deck und Bedingungen</a>.',
      'roadmap.weeks_1_4': 'Wochen 1–4',
      'roadmap.weeks_5_8': 'Wochen 5–8 · Monat 2',
      'roadmap.weeks_9_12': 'Wochen 9–12 · Monat 3',
      'roadmap.weeks_13_16': 'Wochen 13–16 · Monat 4',
      'roadmap.phase_num_1': 'Phase 1',
      'roadmap.phase_num_2': 'Phase 2',
      'roadmap.phase_num_3': 'Phase 3',
      'roadmap.phase_num_4': 'Phase 4',
      'experience.lead': 'Das Prestix.vip-Marken-Hybridrad ist Ihr <strong>VIP-Schlüssel</strong> zu Partner-Locations. Ab der Buchung geht es nicht nur von A nach B—Sie betreten eine kuratierte Reise, in der Anerkennung, Zugang und Zugehörigkeit eingebaut sind. So funktioniert es und warum es eine Erfahrung liefert, die über das hinausgeht, was Geld allein kaufen kann.',
      'experience.recognition_title': 'Automatisierte VIP-Anerkennung',
      'experience.recognition_p1': 'Wenn Sie sich einer Partner-Location mit dem per App getrackten Rad nähern, weiß das System, dass Sie kommen. Das Personal wird in Echtzeit alarmiert und kann einen <strong>eigenen Tisch</strong> und eine persönliche Begrüßung vorbereiten—kein Name-Dropping, kein Warten an der Tür.',
      'experience.recognition_p2': 'Es geht nicht um den Kauf eines Tischs; es geht darum, <strong>erwartet</strong> zu werden. Die Methodik funktioniert, weil die Location durch Sofortabrechnung motiviert ist, jede Prestix.vip-Ankunft priorisiert zu behandeln. Sie erhalten die Anerkennung, die früher Beziehungen oder Glück brauchte—jetzt im Produkt. Ergebnis: Sie betreten die Location wie ein Stammgast, nicht wie ein Fremder.',
      'experience.perks_title': 'Prioritäts-Vorteile',
      'experience.perks_p1': '<strong>Kostenloser Valet</strong> für das Rad und <strong>sofortiger Einlass</strong>—Sie umgehen jede Schlange. Sie werden mit der Effizienz hereingeführt, die einen Abend zu einem nahtlosen 5-Sterne-Fluss macht.',
      'experience.perks_p2': 'Dieser Fluss zählt. Ohne Reibung konzentrieren Sie sich auf das Wesentliche: Musik, Menge, Gespräch. Prioritäts-Vorteile sind die Grundlage für ein <strong>sofortiges 5-Sterne-Erlebnis</strong>. Sie zahlen nicht extra an der Tür—Sie haben es sich mit dem Rad schon verdient. Das System bringt Ihren Komfort mit der operativen Klarheit der Location in Einklang.',
      'experience.settlement_title': 'Echtzeit-Abrechnung',
      'experience.settlement_p1': 'Tische und Tickets können mit <strong>Karte, Apple Pay oder Krypto</strong>—inkl. <strong>ETH</strong>, <strong>USDT</strong> und anderen Tokens—gekauft werden. Im Hintergrund wird <strong>sofort</strong> aufgeteilt: Promoter 10 %, Marktplatz 2,5 %, Location 87,5 %. Keine 7–30 Tage Verzögerung; alle werden am Verkaufspunkt bezahlt.',
      'experience.settlement_p2': 'Warum verbessert das Ihre Erfahrung? Weil Sofortabrechnung die Anreize aller ausrichtet. Promoter und Location sind motiviert, Ihren Besuch makellos zu machen—ihr Umsatz ist bereits gesichert. Sie spüren den Unterschied in reibungsloserem Service und einer Location, die Sie wirklich willkommen heißt.',
      'experience.compliance_title': 'Sicherheit, Datenschutz & Compliance',
      'experience.compliance_p': 'Alle Zahlungen und Daten entsprechen höchsten Standards für <strong>Sicherheit und Datenschutz</strong>. Die Plattform ist <strong>mit lokalen Gesetzen und Vorschriften konform</strong> in jedem Markt—ob Sie mit Karte oder Krypto zahlen, Ihre Transaktion ist sicher und konform.',
      'experience.why_title': 'Warum diese Methodik funktioniert: Über Geld hinaus',
      'experience.why_p1': 'Die besten Abende sind nicht die, die Sie einfach bezahlen—sondern die, bei denen Sie <strong>erkannt</strong>, <strong>einbezogen</strong> und von Menschen umgeben sind, die denselben Standard teilen. Prestix.vip ist dafür konzipiert.',
      'experience.why_p2': '<strong>Unterhaltung, die Geld nicht kaufen kann:</strong> Sie können den Moment nicht kaufen, in dem Sie namentlich begrüßt werden, oder das Gefühl, direkt zu Ihrem Tisch zu gehen. Diese Momente kommen von einem System, das Ihre Ankunft als Ereignis behandelt—nicht als Transaktion. Das Rad ist das Signal; Plattform und Partner erledigen den Rest.',
      'experience.why_p3': '<strong>Verbindung mit Gleichgesinnten:</strong> Jeder auf einem Prestix.vip-Rad hat denselben Weg gewählt: Premium-Mobilität, Partner-Locations und ein reibungsloser Abend. Sie sind in Räumen mit Menschen, die Erfahrung vor Aufwand schätzen. Diese gemeinsame Wahl schafft einen natürlichen Filter—Sie sind nicht nur in einer Menge; Sie sind unter Gästen, die es verstehen.',
      'experience.why_p4': '<strong>Sofortiges 5-Sterne-Erlebnis:</strong> Keine Gutscheine, kein „Ich stehe auf der Liste“ an der Tür. Vom Rad zum Tisch ist die Erfahrung durchgehend. Sie kaufen nicht am Abend nach—Sie sind bereits in der Stufe mit der besten Behandlung. Das ist der Kern der Methodik.',
      'experience.why_p5': 'Das Rad mieten ist nicht nur Transport—es ist ein <strong>All-Access-Pass</strong> zu Anerkennung, Priorität und einem Raum voller Menschen, die dasselbe erwarten. Das ist die Zukunft der Gastfreundschaft, die wir bauen.',
      'contact.name_placeholder': 'Name',
      'contact.email_placeholder': 'E-Mail*',
      'contact.message_placeholder': 'Nachricht',
      'account.title': 'Konto',
      'account.signin_title': 'Registrieren / Anmelden',
      'account.signin_text': 'Melden Sie sich mit Google an, um Ihr Prestix.vip-Profil, Einstellungen und Benachrichtigungen zu verwalten.',
      'account.continue_google': 'Mit Google fortfahren',
      'account.account_data': 'Kontodaten',
      'account.sign_out': 'Abmelden',
      'account.preferences_title': 'Einstellungen',
      'account.preferences_text': 'Geben Sie Ihre Rolle und Präferenzen an, damit wir Ihr Profil einordnen und die App und Dienste für Sie personalisieren können. Ihre Auswahl wird gespeichert und in Ihrer gesamten Nutzung verwendet.',
      'account.notifications_title': 'Benachrichtigungen',
      'account.notifications_text': 'Wählen Sie, wie Sie beim Start des Marktplatzes und bei Updates benachrichtigt werden möchten. Sie können Push-Benachrichtigungen aktivieren oder „Beim Start benachrichtigen“ im Menü nutzen.',
      'drawer.account': 'Konto',
      'drawer.account_data': 'Kontodaten',
      'drawer.theme_language': 'Design & Sprache',
      'drawer.not_signed_in': 'Nicht angemeldet',
      'drawer.sign_out': 'Abmelden',
      'drawer.select_profile': 'Willkommen bei Prestix.vip. Lassen Sie uns etwas Großes aufbauen.',
      'drawer.select_profile_text': 'Helfen Sie uns, Ihre Erfahrung anzupassen, indem Sie sich eine Minute Zeit nehmen, die folgenden Fragen zu beantworten.',
      'drawer.benefits_for_profile': 'Vorteile für Ihr Profil',
      'drawer.back': 'Zurück',
      'drawer.cancel': 'Abbrechen',
      'drawer.next': 'Weiter',
      'drawer.done': 'Fertig',
      'drawer.save': 'Speichern',
      'drawer.profile_overview': 'Profilübersicht',
      'drawer.step_of': 'Schritt {n} von 9',
      'drawer.mission': 'Mission',
      'drawer.mission_text': 'Inklusiver Promoters Hub für Venues, Event-Organisatoren & Promoter. Eine Plattform für alle Promo-Bedürfnisse—Sofortauszahlungen, ein Dashboard, VIP-Zugang.',
      'drawer.platform': 'Plattform',
      'drawer.platform_text': 'Ein fairer Marktplatz mit schlanken Abläufen und transparenter Wertschöpfung für Locations und Promoter.',
      'drawer.value': 'Wert',
      'drawer.value_text': 'Was Sie bekommen: Sofortabrechnung, klare Ökonomie und ein Dashboard für Ihre Abläufe.',
      'drawer.venues': 'Locations',
      'drawer.venues_text': 'Partnerlocations und wie wir uns in Premium-Standorte in Ihrem Markt integrieren.',
      'drawer.roadmap': 'Roadmap',
      'drawer.roadmap_text': 'Zeitplan für den Start und die nächsten Schritte für Marktplatz und Flotte.',
      'drawer.experience': 'Erlebnis',
      'drawer.experience_text': 'Das VIP-Erlebnis: Anerkennung, reservierte Tische und reibungsloser Einlass in Partnerlocations.',
      'drawer.feedback': 'Feedback',
      'drawer.feedback_text': 'Was frühe Partner und Gäste über Prestix.vip sagen.',
      'drawer.contact': 'Kontakt & Partner werden',
      'drawer.pitch': 'Investoren-Pitch',
      'nav.section_pitch': 'Pitch',
      'drawer.contact_text': 'Melden Sie sich, um als Promoter oder Location-Partner dabei zu sein. Wir begleiten Sie bei den nächsten Schritten.',
      'drawer.go_mission': 'Zur Mission',
      'drawer.go_platform': 'Zur Plattform',
      'drawer.go_value': 'Zum Wert',
      'drawer.go_venues': 'Zu Locations',
      'drawer.go_roadmap': 'Zur Roadmap',
      'drawer.go_experience': 'Zum Erlebnis',
      'drawer.go_feedback': 'Zum Feedback',
      'drawer.go_contact': 'Zum Kontakt',
      'feedback.question': 'Würden Sie das Rad mieten?',
      'feedback.yes': 'Ja',
      'feedback.no': 'Nein',
      'feedback.comment_placeholder': 'Kommentar (optional)',
      'feedback.submit': 'Antwort senden',
      'feedback.thanks': 'Danke für Ihr Feedback.',
      'contact.send': 'SENDEN',
      'contact.newsletter': 'Melden Sie sich für unsere E-Mail-Liste für Neuigkeiten, Aktionen und mehr an.',
      'account.field_email': 'E-Mail',
      'account.field_name': 'Name',
      'account.field_image': 'Bild',
      'account.nda_accepted': 'NDA akzeptiert',
      'account.nda_yes': 'Ja',
      'account.nda_no': 'Nein',
      'account.signed_in': 'Angemeldet',
      'search.no_matches': 'Keine Treffer',
      'contact.sending': 'Wird gesendet…',
      'contact.thanks_message': 'Danke für Ihre Nachricht. Wir melden uns bei Ihnen.',
      'contact.error_generic': 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.',
      'nav.section_landing': 'Start',
      'nav.section_account': 'Konto',
      'nav.section_settings': 'Einstellungen',
      'profile.completion': 'Profil {p}% vollständig',
      'profile.status_complete': '{p}% Vollständig',
      'profile.name': 'Name',
      'profile.email': 'E-Mail',
      'profile.company_or_handle': 'Unternehmen oder Social Handle',
      'profile.event_types': 'Arten von Events, die Sie promoten',
      'profile.volume': 'Erwartetes Volumen (optional)',
      'profile.venue_name': 'Venue-Name',
      'profile.role_at_venue': 'Ihre Rolle im Venue',
      'profile.market': 'Markt / Stadt (optional)',
      'profile.investment_focus': 'Investment-Fokus (optional)',
      'profile.contact_preference': 'Bevorzugte Kontaktmethode',
      'profile.how_heard': 'Wie haben Sie von uns erfahren?',
      'profile.comments': 'Zusätzliche Kommentare (optional)',
      'profile.event_nightlife': 'Nachtleben',
      'profile.event_concerts': 'Konzerte',
      'profile.event_private': 'Private Events',
      'profile.event_corporate': 'Firmen-Events',
      'profile.event_festivals': 'Festivals',
      'profile.event_sports': 'Sport',
      'profile.event_other': 'Andere',
      'profile.volume_under_50': 'Unter 50 / Monat',
      'profile.volume_50_200': '50–200 / Monat',
      'profile.volume_200_500': '200–500 / Monat',
      'profile.volume_500_plus': '500+ / Monat',
      'profile.volume_prefer_not': 'Keine Angabe',
      'profile.role_gm': 'Geschäftsführer',
      'profile.role_owner': 'Eigentümer',
      'profile.role_events_manager': 'Event-Manager',
      'profile.role_marketing': 'Marketing',
      'profile.role_other': 'Andere',
      'profile.how_social': 'Soziale Medien',
      'profile.how_referral': 'Empfehlung',
      'profile.how_online_ad': 'Online-Werbung',
      'profile.how_event': 'Event',
      'profile.how_search': 'Suche',
      'profile.how_other': 'Andere',
      'profile.save': 'Profil speichern',
      'profile.saved_local': 'Profil lokal gespeichert.',
      'profile.saved_uploaded': 'Profil gespeichert und an das Team gesendet.',
      'profile.save_failed': 'Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.',
      'questions.q1.promoter.title': 'Was interessiert Sie am meisten?',
      'questions.q1.partner.title': 'Was interessiert Sie am meisten?',
      'questions.q1.marketplace.title': 'Was interessiert Sie am meisten?',
      'questions.q2.promoter.title': 'Arten von Events, die Sie promoten',
      'questions.q2.partner.title': 'Ihre Rolle im Venue',
      'questions.q2.marketplace.title': 'Wie haben Sie von uns erfahren?',
      'questions.q3.promoter.title': 'Erwartetes Volumen (optional)',
      'questions.q3.partner.title': 'Markt / Stadt',
      'questions.q3.marketplace.title': 'Irgendwelche Kommentare?',
      'questions.q4.promoter.title': 'Wie haben Sie von uns erfahren?',
      'questions.q4.partner.title': 'Venue-Kapazität oder -Typ',
      'questions.q4.marketplace.title': 'Sollten wir noch etwas wissen?',
      'questions.q5.promoter.title': 'Bevorzugte Kontaktmethode',
      'questions.q5.partner.title': 'Bevorzugte Kontaktmethode',
      'questions.q5.marketplace.title': 'Bevorzugte Art, auf dem Laufenden zu bleiben',
      'questions.q5.contact_email_label': 'E-Mail-Adresse',
      'questions.q5.contact_email_placeholder': 'Ihre E-Mail',
      'questions.q5.contact_whatsapp_label': 'WhatsApp-Nummer',
      'questions.q5.contact_whatsapp_placeholder': 'Nummer mit Ländercode',
      'questions.q5.contact_call_label': 'Telefonnummer',
      'questions.q5.contact_call_placeholder': 'Telefonnummer',
      'questions.q5.contact_other_label': 'Angeben',
      'questions.q5.contact_other_placeholder': 'Wie sollen wir Sie kontaktieren?',
      'questions.q6.promoter.title': 'Zielmärkte oder -städte',
      'questions.q6.partner.title': 'Integrations-Zeitplan',
      'questions.q6.marketplace.title': 'Noch etwas?',
      'questions.q7.promoter.title': 'Aktuelle Promoter-Erfahrung',
      'questions.q7.partner.title': 'Zusätzliche Infos über Ihr Venue',
      'questions.q7.marketplace.title': 'Noch etwas?',
      'questions.q8.promoter.title': 'Zusätzliche Kommentare',
      'questions.q8.partner.title': 'Zusätzliche Kommentare',
      'questions.q8.marketplace.title': 'Zusätzliche Kommentare',
      'questions.opt_empty': '—',
      'questions.opt_other': 'Andere',
      'questions.opt_interest_commission': 'Provision und sofortige Auszahlungen',
      'questions.opt_interest_events': 'Event-Arten, die ich promoten kann',
      'questions.opt_interest_getting_started': 'Erste Schritte',
      'questions.opt_interest_volume': 'Volumen und Skalierung',
      'questions.opt_interest_onboarding': 'Onboarding-Prozess für Promoter',
      'questions.opt_interest_integrate': 'Wie unser Venue integriert wird',
      'questions.opt_interest_dashboard': 'Dashboard und sofortige Auszahlungen',
      'questions.opt_interest_vip_alerts': 'VIP-Benachrichtigungen und Anerkennung',
      'questions.opt_interest_roi': 'ROI und Geschäftsökonomie',
      'questions.opt_interest_vip': 'VIP-Zugang und Anerkennung',
      'questions.opt_interest_booking': 'Fahrrad und Tische buchen',
      'questions.opt_interest_venues': 'Partner-Venues und Erfahrung',
      'questions.opt_contact_email': 'E-Mail',
      'questions.opt_contact_call': 'Anruf',
      'questions.opt_contact_whatsapp': 'WhatsApp',
      'questions.opt_timeline_asap': 'So bald wie möglich',
      'questions.opt_timeline_1_3': '1–3 Monate',
      'questions.opt_timeline_3_6': '3–6 Monate',
      'questions.opt_timeline_exploring': 'Nur erkunden',
      'questions.opt_venue_nightclub': 'Nachtclub',
      'questions.opt_venue_restaurant': 'Restaurant',
      'questions.opt_venue_bar': 'Bar',
      'questions.opt_venue_event_space': 'Veranstaltungsraum',
    },
    id: {
      'settings.title': 'Pengaturan',
      'settings.theme': 'Tema',
      'settings.theme_desc': 'Pilih tampilan terang atau gelap untuk situs.',
      'settings.theme_dark': 'Gelap',
      'settings.theme_light': 'Terang',
      'settings.language': 'Bahasa',
      'settings.language_desc': 'Pilihan Anda berlaku untuk seluruh situs, termasuk halaman Pengaturan ini. Semua label dan konten akan ditampilkan dalam bahasa yang dipilih.',
      'settings.admin': 'Admin',
      'settings.admin_export_desc': 'Unduh semua profil pengguna yang dikirimkan sebagai file Excel. File berisi lembar "Semua Pengguna" dan satu lembar per pengguna.',
      'settings.download_all_users': 'Unduh Semua Data Pengguna',
      'settings.admin_feedback_export_desc': 'Unduh respons "Apakah Anda akan menyewa sepeda?" (Ya/Tidak) sebagai file Excel.',
      'settings.download_question_data': 'Unduh data pertanyaan',
      'users.title': 'Manajemen pengguna',
      'users.desc': 'Kelola pengguna yang telah masuk dan tetapkan peran admin.',
      'users.drawer_title': 'Manajemen pengguna',
      'users.manage': 'Kelola pengguna',
      'nda.title': 'Perjanjian Kerahasiaan',
      'nda.text': 'Informasi di situs web ini, termasuk model bisnis, keuangan, peta jalan, dan detail produk, bersifat rahasia dan hanya untuk investor serta mitra yang memenuhi syarat. Dengan mengakses situs ini, Anda setuju untuk tidak mengungkapkan, mereproduksi, atau menggunakan informasi tersebut tanpa persetujuan tertulis dari Prestix.vip.',
      'nda.accept': 'Terima NDA',
      'push.title': 'Jadilah yang pertama bergabung',
      'push.text': 'Dapatkan notifikasi saat marketplace Prestix.vip diluncurkan. Anda akan termasuk yang pertama mengakses platform.',
      'push.close': 'Tutup',
      'signin.title': 'Masuk atau Daftar',
      'signin.text': 'Gunakan akun Google atau email dan kata sandi untuk melanjutkan.',
      'signin.continue_google': 'Lanjutkan dengan Google',
      'signin.or': 'atau',
      'signin.tab_signin': 'Masuk',
      'signin.tab_signup': 'Daftar',
      'signin.skip': 'Lewati dulu',
      'header.search': 'Cari…',
      'hero.tagline': 'Promosikan & Dapatkan.',
      'hero.tagline_promoter': 'Promosikan & Dapatkan.',
      'hero.tagline_partner': 'Optimalkan & Skala.',
      'hero.tagline_organizer': 'Selenggarakan & Settle.',
      'hero.choose_experience': 'Pilih pengalaman Anda untuk melihat konten yang relevan',
      'hero.subline': 'Memberdayakan promoter acara untuk membangun hubungan yang lebih kuat, menjangkau audiens, dan mempromosikan acara.',
      'hero.benefit': 'Hub Promoter inklusif untuk Venues, Event Organizers & Promoters.',
      'hero.benefit_promoter': 'Pembagian pembayaran instan dan otomatis. Marketplace merampingkan operasi promosi Anda.',
      'hero.benefit_partner': 'Satu dashboard untuk mengelola promoter, melacak kinerja, dan menskalakan venue Anda. Pembayaran instan, alert VIP, papan peringkat promoter.',
      'hero.benefit_organizer': 'Selenggarakan acara dengan pembayaran instan. Atur persentase promosi acara Anda untuk menarik lebih banyak promoter; sasarkan komunitas Anda dengan panduan dan promosi tertarget ke anggota tertentu.',
      'role.title': 'Bagaimana Anda akan menggunakan Prestix.vip?',
      'role.subtitle': 'Prestix.vip utamanya adalah Promoters Hub—untuk mengoptimalkan, mengelola, melacak, dan menskalakan operasi promosi venue. Pilih profil Anda untuk mempersonalisasi aplikasi dan pengalaman Anda.',
      'role.all': 'Semua',
      'role.all_desc': 'Ringkasan untuk venue, penyelenggara acara, dan promoter.',
      'role.user': 'Pengguna',
      'role.user_desc': 'Akses VIP, pengakuan, tanpa gesekan di venue mitra.',
      'role.promoter': 'Promoter',
      'role.promoter_desc': 'Optimalkan, kelola, lacak, dan skala semua operasi promosi venue Anda. Komisi 10%, dibayar instan.',
      'role.partner': 'Partner',
      'role.partner_desc': 'Kelola promoter, lacak kinerja, skala venue Anda. Satu dashboard, pembayaran instan, alert VIP.',
      'role.organizer': 'Penyelenggara acara',
      'role.organizer_desc': 'Selenggarakan acara dengan pembayaran instan. Atur % promosi, sasarkan komunitas dengan panduan, dan promosi tertarget ke anggota tertentu.',
      'platform.for_organizers_heading': 'Untuk penyelenggara acara',
      'platform.for_organizers_text': 'Selenggarakan acara dengan pembayaran instan untuk Anda, venue dan promoter. Satu marketplace, satu alur—tiket, meja, dan pembayaran sinkron. Atur persentase promosi acara Anda untuk menarik lebih banyak promoter. Minta promoter mempromosikan ke komunitas Anda: tetapkan panduan yang harus diikuti dan jalankan promosi tertarget ke anggota tertentu. Integrasi dengan vendor utama; semua dibayar di titik penjualan.',
      'role.marketplace': 'Pengguna',
      'role.marketplace_desc': 'Akses VIP, pengakuan, tanpa gesekan di venue mitra.',
      'section.mission': 'Misi',
      'section.mission_sub': 'Hub Promoter inklusif — satu platform untuk Venues, Event Organizers & Promoters. Prestix.vip',
      'section.platform': 'Marketplace',
      'section.platform_sub': 'Pasar yang adil dengan operasi yang efisien dan nilai transparan untuk semua',
      'section.venues': 'Kemitraan untuk Venue',
      'section.venues_sub': 'Venue mitra dan cara kerjanya untuk Anda',
      'section.value': 'Nilai Unik',
      'section.value_sub': 'Apa yang Anda dapatkan',
      'section.roadmap': 'Peta Jalan',
      'section.roadmap_sub': 'Di mana kami sekarang dan apa selanjutnya—jalan menuju impas operasional',
      'section.experience': 'Pengalaman VIP Eksklusif',
      'section.experience_sub': 'Menyewa sepeda bukan sekadar transportasi—ini adalah tiket akses penuh.',
      'section.contact': 'Hubungi Kami',
      'section.contact_sub': 'Kirim pesan!',
      'mission.all': 'Kami melayani <strong>Venues, Event Organizers & Promoters</strong> melalui <strong>Hub Promoter inklusif</strong>—satu platform untuk semua kebutuhan promosi. Sebagai tamu, sepeda adalah <strong>kunci VIP</strong> Anda ke venue mitra: pengakuan, meja khusus, dan pengalaman <strong>yang tak bisa dibeli dengan uang</strong>. Sebagai promoter: <strong>Mesin Pembayaran Tanpa Gesekan</strong>, komisi di titik penjualan, tanpa tunggakan 7–30 hari. Sebagai venue atau organizer: likuiditas real-time, satu dashboard, dan kontrol penuh atas pengeluaran promosi serta kedatangan VIP. Penyelesaian instan, pembayaran tanpa gesekan, dan ekosistem berbasis teknologi dengan jalan jelas menuju profitabilitas.',
      'mission.patron': 'Kami melayani <strong>Venues, Event Organizers & Promoters</strong> melalui <strong>Hub Promoter inklusif</strong>—satu platform untuk semua kebutuhan promosi. Sebagai tamu, sepeda adalah <strong>kunci VIP</strong> Anda ke venue mitra: pengakuan, meja khusus, dan pengalaman <strong>yang tak bisa dibeli dengan uang</strong>—tanpa menyebut nama, tanpa antre.',
      'mission.promoter': 'Kami melayani <strong>Venues, Event Organizers & Promoters</strong> melalui <strong>Hub Promoter inklusif</strong>—satu platform untuk semua kebutuhan promosi Anda. Sebagai promoter, Anda dapat <strong>Mesin Pembayaran Tanpa Gesekan</strong>: komisi di titik penjualan, tanpa tunggakan 7–30 hari.',
      'mission.management': 'Kami melayani <strong>Venues, Event Organizers & Promoters</strong> dengan <strong>Hub Promoter inklusif</strong>—satu platform untuk semua kebutuhan promosi. Sebagai venue atau organizer: likuiditas real-time, satu dashboard, dan kontrol penuh atas pengeluaran promosi serta kedatangan VIP.',
      'mission.investor': 'PRESTIX.VIP adalah <strong>Hub Promoter inklusif</strong> untuk <strong>Venues, Event Organizers & Promoters</strong>—satu platform untuk semua kebutuhan promosi. Penyelesaian instan, pembayaran tanpa gesekan, dan ekosistem berbasis teknologi (armada bermerek, dashboard venue, alat promoter) dengan jalan jelas menuju profitabilitas.',
      'platform.lead': 'Prestix.vip memberi promoter dan venue alat serta kejelasan untuk menjalankan promosi dalam skala—tanpa tebakan, tanpa hambatan manual, dan dengan visibilitas jelas siapa yang mendorong bisnis nyata.',
      'platform.for_users_heading': 'Untuk Pengguna',
      'platform.for_users_text': 'Kunci VIP Anda ke venue mitra. Pengalaman premium, tanpa gesekan—meja khusus, pengakuan instan, valet untuk sepeda. Bayar dengan kartu, Apple Pay, atau kripto. Marketplace dan armada bermerek memberi Anda status "Black Card" melalui kedekatan GPS di venue mitra.',
      'platform.for_venues_heading': 'Untuk Venue',
      'platform.for_venues_text': 'Analisis dan pelacakan promosi dalam satu dashboard, plus papan peringkat promoter agar Anda melihat siapa yang mendorong hasil. Validasi anggaran promosi dan dapatkan notifikasi alert real-time. Otomasi AI alur kerja berulang, konsistensi layanan pelanggan, dan koneksi abadi dengan pelanggan—sambil menyelesaikan dengan promoter secara instan.',
      'platform.for_promoters_heading': 'Untuk Promoter',
      'platform.for_promoters_text': 'Marketplace yang adil di mana nilai yang Anda dorong jelas dan transparan. Komisi Anda dilacak dan dibayar instan di titik penjualan—tanpa kotak hitam, tanpa pembayaran tertunda. Satu sumber kebenaran agar kontribusi Anda terlihat dan dihargai.',
      'platform.close': 'Kami berintegrasi dengan semua vendor tiket pihak ketiga utama: marketplace dapat berperan sebagai satu sumber kebenaran atau perantara yang mengotomatisasi pembagian pembayaran instan setelah pembeli menyelesaikan pembelian—agar tiket atau meja yang dipesan aman dan venue menerima bagiannya. Pembeli dapat membayar meja dan tiket dengan <strong>kartu, Apple Pay, atau kripto (ETH, USDT, dll.)</strong>. Semua transaksi memenuhi standar <strong>keamanan dan privasi</strong> tertinggi serta <strong>sesuai regulasi dan hukum setempat</strong>. Bersama armada hybrid bermerek, marketplace juga memberikan status <strong>"Black Card"</strong> kepada tamu melalui alert kedekatan GPS di venue mitra.',
      'platform.investor': '<strong>Produk:</strong> Armada bermerek + marketplace iOS dengan pemesanan real-time dan GPS. <strong>Model pendapatan:</strong> 10% promoter / 2,5% marketplace / 87,5% venue pembagian instan. Kartu, Apple Pay, kripto. <strong>Dashboard venue:</strong> Pusat komando kedatangan langsung, alert kedekatan, transparansi finansial. Dapat diskalakan di venue premium di pasar mana pun.',
      'venues.patron': 'Venue mitra Prestix.vip mengenali Anda saat tiba dengan sepeda. Anda dapat <strong>meja khusus</strong>, <strong>masuk gratis</strong>, dan <strong>valet depan</strong>. Tanpa antre, tanpa daftar pintu—akses Anda sudah termasuk. Pesan lewat platform dan datang; venue siap untuk Anda.',
      'venues.promoter': 'Setiap penjualan di marketplace divalidasi dan diselesaikan <strong>secara instan</strong>—venue dapat bagiannya, Anda 10%, platform menjalankan pembagian dalam satu alur. Tanpa double-booking, tanpa tunggakan pembayaran. Venue melihat papan peringkat promoter dan alert real-time.',
      'venues.management_lead': 'Kami terintegrasi dengan <strong>semua vendor tiket pihak ketiga utama</strong>. Setiap tiket atau meja yang dipesan lewat marketplace divalidasi dan tersedia—entah marketplace sebagai <strong>satu sumber kebenaran</strong> atau kami sebagai <strong>perantara</strong> yang mengotomatisasi pembagian pembayaran instan saat pembeli selesai. Venue menerima pembayaran; promoter dan marketplace diselesaikan dalam alur yang sama. Tanpa double-booking, tanpa tunggakan.',
      'venues.benefit_1': 'Analisis & pelacakan promosi — Satu dashboard. Lihat kampanye dan promoter mana yang mendatangkan lalu lintas dan pendapatan.',
      'venues.benefit_2': 'Papan peringkat promoter — Peringkat dan bandingkan kinerja promoter agar anggaran diinvestasikan di tempat yang berhasil.',
      'venues.benefit_3': 'Validasi anggaran promosi — Lacak pengeluaran dan ROI secara real-time; sejajarkan anggaran dengan hasil nyata.',
      'venues.benefit_4': 'Notifikasi alert real-time — Kedatangan VIP, milestone penjualan, dan update operasional agar tim bisa bertindak segera.',
      'venues.benefit_5': 'Konsistensi layanan pelanggan — Standar tinggi yang sama untuk setiap tamu; platform mendukung proses agar kualitas tidak bergantung pada shift.',
      'venues.benefit_6': 'Membangun koneksi abadi — Dari sentuhan pertama hingga kunjungan berulang; pengalaman dirancang mengubah tamu jadi langganan dan mitra jadi hubungan jangka panjang.',
      'venues.integrations_title': 'Vendor tiket utama & integrasi',
      'venues.integrations_intro': 'Marketplace terhubung dengan platform tiket terkemuka via API dan SDK bila tersedia, agar inventori dan penjualan tetap sinkron dan penyelesaian instan bekerja di stack Anda.',
      'venues.integrations_note': 'Vendor tambahan dapat didukung lewat integrasi kustom; kami prioritas platform yang mengekspos API dan SDK publik atau mitra untuk sinkronisasi real-time yang aman.',
      'venues.compliance_title': 'Opsi pembayaran & kepatuhan regulasi',
      'venues.compliance_text': 'Meja dan tiket venue dapat dibeli dengan <strong>kartu, Apple Pay, atau kripto (ETH, USDT, dan token lain)</strong>. Kami menekankan <strong>keamanan dan privasi terbaik</strong>; platform <strong>patuh regulasi lokal yang berlaku</strong> di setiap pasar.',
      'venues.close': 'Untuk investor dan operator venue: ini utilitas di balik kemitraan—operasi promosi yang ramping, nilai transparan, dan marketplace yang mengamankan inventori dan membayar semua pihak secara instan.',
      'venues.investor': 'Integrasi dengan <strong>Eventbrite, Ticketmaster, DICE, See Tickets</strong>. Satu sumber kebenaran atau perantara untuk pembagian pembayaran instan. Tanpa double-booking, tanpa tunggakan. Dashboard venue: analisis promosi, papan peringkat promoter, alert kedatangan VIP real-time (mis. 500 m). Kepatuhan pembayaran dan regulasi di semua pasar.',
      'venues.onboarding_title': 'Onboarding venue — Menjadi mitra',
      'venues.onboarding_lead': 'Untuk menjadi mitra Prestix.vip, venue membeli kemitraan. Ini memberi venue akses penuh ke semua utilitas platform dan membuka marketplace agar proses operasional promosi mitra saat ini dapat diintegrasikan dengan marketplace khusus untuk mitra tersebut.',
      'venues.onboarding_privacy': 'Mitra dapat memilih untuk menjaga semua aspek operasi saat mereka tetap privat di marketplace, atau mengaktifkan bagian publik operasi.',
      'venues.onboarding_fee': 'Biaya keanggotaan kemitraan bulanan: $500 USD per bulan.',
      'value.patron_h': 'Untuk Patron',
      'value.patron_p': 'Sepeda adalah <strong>Kuncinya</strong>. Meja khusus, masuk gratis, dan valet di venue mitra. Lewati antre—pengakuan sudah termasuk.',
      'value.promoter_h': 'Untuk Promoter',
      'value.promoter_p': '<strong>Komisi 10%</strong> dikirim instan di titik penjualan. Tanpa tunggu 7–30 hari. Satu dashboard, transparansi penuh.',
      'value.venue_h': 'Untuk Venue',
      'value.venue_p': '<strong>87,5%</strong> pembagian pendapatan instan. Analisis promosi, papan peringkat promoter, alert real-time. Kedatangan VIP diumumkan 500 m sebelum pintu. Terintegrasi dengan Eventbrite, Ticketmaster, DICE, See Tickets.',
      'value.investor_h': 'Ringkasan investor',
      'value.investor_p': '<strong>Kelayakan:</strong> Pasar 9/10, Model 8/10, Pendapatan 8/10, Keunggulan 9/10, Skalabilitas 8/10. <strong>CAPEX:</strong> ~AUD 40.000. <strong>Pendapatan:</strong> sewa AUD 60–80/acara; biaya transaksi 2,5%. <strong>Target 4 bulan:</strong> breakeven operasional pada ~75% utilisasi armada. Posisi unik: penyelesaian instan + flywheel VIP.',
      'roadmap.intro': 'Kami meluncurkan sepeda dan pengalaman Black Card di venue mitra. Prestix.vip menjalankan <strong>rencana 4 bulan</strong> dari fondasi hingga profitabilitas. Timeline di bawah menunjukkan fase, posisi saat ini, dan milestone yang masih harus dicapai. <a href="#contact" class="roadmap-link">Hubungi kami</a> untuk akses awal atau integrasi.',
      'roadmap.patron_intro': 'Kami meluncurkan sepeda dan pengalaman Black Card di venue mitra. Selanjutnya: lebih banyak kota, venue, dan pemesanan mulus agar Anda bisa memesan perjalanan dan meja dalam satu alur. <a href="#contact" class="roadmap-link">Hubungi kami</a> untuk akses awal.',
      'roadmap.promoter_intro': 'Prestix.vip menjalankan <strong>rencana 4 bulan</strong> dari fondasi hingga profitabilitas. Timeline di bawah menunjukkan fase, posisi saat ini, dan milestone yang masih harus dicapai.',
      'roadmap.we_here': 'Kami di sini',
      'roadmap.phase_1_title': 'Fondasi & Keselarasan Merek',
      'roadmap.phase_1_desc': 'Amankan armada; finalisasi branding dan detail per venue. Tetapkan daftar "Promoter Undangan" dan luncurkan pembagian pembayaran instan (10% / 2,5% / 87,5%).',
      'roadmap.phase_2_title': 'Peluncuran di Venue Ankor',
      'roadmap.phase_2_desc': 'Go-live di 2 venue mitra ankor (Venue X). Promoter melihat pembayaran instan pertama. Target: 40% utilisasi armada dan pendapatan sewa awal.',
      'roadmap.phase_3_title': 'Aktivasi VIP & Skala',
      'roadmap.phase_3_desc': 'Pasarkan sepeda sebagai "Satu-satunya Cara Datang." Perluas ke venue mitra tambahan. Biaya transaksi 2,5% bertambah seiring volume tiket.',
      'roadmap.phase_4_title': 'Optimisasi & Profitabilitas',
      'roadmap.phase_4_desc': 'Gunakan GPS dan data venue untuk mengoptimalkan penempatan sepeda. Target 75% utilisasi armada. Capai <strong>breakeven operasional</strong> dan arus kas bersih positif.',
      'roadmap.in_progress': 'Sedang berjalan',
      'roadmap.todo': 'Perlu dilakukan',
      'roadmap.phase_1_item1': 'Cakupan armada dan branding',
      'roadmap.phase_1_item2': 'Onboard 20 promoter A-List pertama',
      'roadmap.phase_1_item3': 'Mesin pembayaran live di venue pilot',
      'roadmap.phase_2_item1': 'Integrasi penuh dengan 2 venue ankor',
      'roadmap.phase_2_item2': 'Onboarding dompet promoter selesai',
      'roadmap.phase_2_item3': 'Capai 40% utilisasi armada akhir pekan',
      'roadmap.phase_3_item1': 'Kampanye fokus VIP live',
      'roadmap.phase_3_item2': 'Venue tambahan terintegrasi',
      'roadmap.phase_3_item3': 'Volume transaksi meningkat',
      'roadmap.phase_4_item1': 'Penempatan dan rute berbasis data',
      'roadmap.phase_4_item2': 'Target utilisasi armada 75%',
      'roadmap.phase_4_item3': 'OpEx bulanan tertutup; net positif',
      'roadmap.outro': 'Langkah berikut: perjanjian mitra dan peluncuran dashboard venue untuk alert kedatangan VIP. <a href="#contact" class="roadmap-link">Hubungi kami</a> untuk integrasi atau investasi.',
      'roadmap.investor_intro': '<strong>Jalur 4 bulan menuju profitabilitas:</strong> Bulan 1 — Armada & branding, onboard 20 promoter teratas, mesin pembayaran. Bulan 2 — Go-live di 2 venue ankor, 40% utilisasi. Bulan 3 — Skala ke lebih banyak venue, volume transaksi 2,5% tumbuh. Bulan 4 — 75% utilisasi, breakeven operasional, <strong>arus kas bersih positif</strong>. Kami di Fase 1. <a href="#contact" class="roadmap-link">Hubungi untuk deck dan syarat</a>.',
      'roadmap.weeks_1_4': 'Minggu 1–4',
      'roadmap.weeks_5_8': 'Minggu 5–8 · Bulan 2',
      'roadmap.weeks_9_12': 'Minggu 9–12 · Bulan 3',
      'roadmap.weeks_13_16': 'Minggu 13–16 · Bulan 4',
      'roadmap.phase_num_1': 'Fase 1',
      'roadmap.phase_num_2': 'Fase 2',
      'roadmap.phase_num_3': 'Fase 3',
      'roadmap.phase_num_4': 'Fase 4',
      'experience.lead': 'Sepeda hybrid bermerek Prestix.vip adalah <strong>kunci VIP</strong> Anda ke venue mitra. Sejak Anda memesan, Anda bukan sekadar dari A ke B—Anda memasuki perjalanan terkurasi di mana pengakuan, akses, dan rasa memiliki sudah built-in. Begini cara kerjanya dan mengapa menghadirkan pengalaman yang melampaui apa yang uang saja bisa beli.',
      'experience.recognition_title': 'Pengakuan VIP Otomatis',
      'experience.recognition_p1': 'Saat Anda mendekati venue mitra dengan sepeda yang dilacak app, sistem tahu Anda datang. Staf venue mendapat alert real-time dan bisa menyiapkan <strong>meja khusus</strong> dan sambutan personal—tanpa nama, tanpa menunggu di pintu.',
      'experience.recognition_p2': 'Ini bukan soal membeli meja; ini soal <strong>diharapkan</strong>. Metodologi bekerja karena venue diinsentif oleh penyelesaian instan untuk memperlakukan setiap kedatangan Prestix.vip sebagai prioritas. Anda dapat pengakuan yang dulu butuh hubungan lama atau keberuntungan—sekarang built-in di produk. Hasilnya: Anda masuk seperti pelanggan tetap, bukan orang asing.',
      'experience.perks_title': 'Manfaat Prioritas',
      'experience.perks_p1': '<strong>Valet gratis</strong> untuk sepeda dan <strong>masuk langsung</strong>—Anda lewati setiap antre. Anda diantar dengan efisiensi yang mengubah malam jadi alur bintang lima yang mulus.',
      'experience.perks_p2': 'Alur itu penting. Saat gesekan hilang, Anda fokus pada yang benar-benar membuat malam: musik, kerumunan, percakapan. Manfaat prioritas bukan sekadar kenyamanan; mereka fondasi <strong>pengalaman 5 bintang instan</strong>. Anda tidak bayar ekstra di pintu—Anda sudah dapat dengan memilih sepeda. Sistem menyelaraskan kenyamanan Anda dengan kejelasan operasional venue.',
      'experience.settlement_title': 'Penyelesaian Real-Time',
      'experience.settlement_p1': 'Pembeli dapat membeli <strong>meja atau tiket venue</strong> dengan kartu, Apple Pay, atau <strong>kripto</strong>—termasuk <strong>ETH</strong>, <strong>USDT</strong>, dan token lain. Di belakang layar, dana dibagi <strong>secara instan</strong>: Promoter 10%, Marketplace 2,5%, Venue 87,5%. Tanpa jeda 7–30 hari; semua dibayar di titik penjualan.',
      'experience.settlement_p2': 'Mengapa itu meningkatkan pengalaman Anda? Karena penyelesaian instan menyelaraskan insentif semua pihak. Promoter dan venue termotivasi membuat kunjungan Anda sempurna—pendapatan mereka sudah aman. Staf siap melayani, meja siap, operasi berjalan dengan kepastian pembayaran real-time. Anda merasakan perbedaannya dalam layanan yang lebih lancar dan venue yang siap menyambut Anda.',
      'experience.compliance_title': 'Keamanan, Privasi & Kepatuhan',
      'experience.compliance_p': 'Semua pembayaran dan penanganan data memenuhi standar tertinggi <strong>keamanan dan privasi</strong>. Platform <strong>patuh hukum dan regulasi lokal</strong> di setiap pasar—jadi baik bayar dengan kartu atau kripto, transaksi Anda aman dan patuh.',
      'experience.why_title': 'Mengapa Metodologi Ini Bekerja: Di Luar Uang',
      'experience.why_p1': 'Malam terbaik bukan yang sekadar Anda bayar—melainkan saat Anda <strong>diakui</strong>, <strong>diikutsertakan</strong>, dan dikelilingi orang yang berbagi standar yang sama. Prestix.vip dirancang untuk itu.',
      'experience.why_p2': '<strong>Hiburan yang uang tidak bisa beli:</strong> Anda tidak bisa membeli momen host menyapa nama Anda, atau perasaan berjalan langsung ke meja reservasi sementara yang lain menunggu. Momen itu datang dari sistem yang memperlakukan kedatangan Anda sebagai acara—bukan transaksi. Sepeda adalah sinyal; platform dan mitra mengerjakan sisanya.',
      'experience.why_p3': '<strong>Terhubung dengan orang yang sepaham:</strong> Setiap orang di sepeda Prestix.vip memilih jalan yang sama: mobilitas premium, venue mitra, malam tanpa gesekan. Anda di ruangan dengan orang yang menghargai pengalaman. Pilihan bersama itu menciptakan filter alami—Anda tidak sekadar dalam kerumunan; Anda di antara tamu yang paham. Hasilnya peluang koneksi nyata lebih tinggi.',
      'experience.why_p4': '<strong>Pengalaman 5 bintang instan:</strong> Tanpa voucher, tanpa "saya di daftar" di pintu. Dari sepeda ke meja, pengalaman berkelanjutan. Anda tidak membeli upgrade di malam hari—Anda sudah di tier yang dapat perlakuan terbaik. Itu inti metodologi: rancang produk agar hasil default adalah keunggulan.',
      'experience.why_p5': 'Menyewa sepeda bukan sekadar transportasi—ini <strong>tiket akses penuh</strong> ke pengakuan, prioritas, dan ruangan penuh orang yang mengharapkan hal yang sama. Itu masa depan hospitalitas yang kami bangun.',
      'contact.name_placeholder': 'Nama',
      'contact.email_placeholder': 'Email*',
      'contact.message_placeholder': 'Pesan',
      'account.title': 'Akun',
      'account.signin_title': 'Daftar / Masuk',
      'account.signin_text': 'Masuk dengan Google untuk mengelola profil, preferensi, dan notifikasi Prestix.vip Anda.',
      'account.continue_google': 'Lanjutkan dengan Google',
      'account.account_data': 'Data akun',
      'account.sign_out': 'Keluar',
      'account.preferences_title': 'Preferensi Pengguna',
      'account.preferences_text': 'Berikan peran dan preferensi Anda agar kami dapat mengklasifikasi profil dan mempersonalisasi aplikasi serta layanan. Pilihan Anda disimpan ke akun dan digunakan di seluruh pengalaman Anda.',
      'account.notifications_title': 'Notifikasi',
      'account.notifications_text': 'Pilih bagaimana Anda ingin diberitahu saat marketplace diluncurkan dan saat ada pembaruan. Anda dapat mengaktifkan notifikasi push atau "Beritahu saat diluncurkan" dari menu.',
      'drawer.account': 'Akun',
      'drawer.account_data': 'Data akun',
      'drawer.theme_language': 'Tema & Bahasa',
      'drawer.not_signed_in': 'Belum masuk',
      'drawer.sign_out': 'Keluar',
      'drawer.select_profile': 'Selamat datang di Prestix.vip. Mari kita wujudkan sesuatu yang hebat.',
      'drawer.select_profile_text': 'Bantu kami menyesuaikan pengalaman Anda dengan meluangkan waktu sebentar untuk menjawab pertanyaan di bawah ini.',
      'drawer.benefits_for_profile': 'Manfaat untuk profil Anda',
      'drawer.back': 'Kembali',
      'drawer.cancel': 'Batal',
      'drawer.next': 'Lanjut',
      'drawer.done': 'Selesai',
      'drawer.save': 'Simpan',
      'drawer.profile_overview': 'Ringkasan profil',
      'drawer.step_of': 'Langkah {n} dari 9',
      'drawer.mission': 'Misi',
      'drawer.mission_text': 'Hub Promoter inklusif untuk Venues, Event Organizers & Promoters. Satu platform untuk semua kebutuhan promosi—pembayaran instan, satu dashboard, akses VIP.',
      'drawer.platform': 'Platform',
      'drawer.platform_text': 'Pasar yang adil dengan operasi efisien dan nilai transparan untuk venue dan promoter.',
      'drawer.value': 'Nilai',
      'drawer.value_text': 'Apa yang Anda dapatkan: penyelesaian instan, ekonomi jelas, dan satu dashboard untuk operasi Anda.',
      'drawer.venues': 'Venue',
      'drawer.venues_text': 'Venue mitra dan cara kami berintegrasi dengan lokasi premium di pasar Anda.',
      'drawer.roadmap': 'Peta Jalan',
      'drawer.roadmap_text': 'Linimasa peluncuran dan rencana selanjutnya untuk marketplace dan armada.',
      'drawer.experience': 'Pengalaman',
      'drawer.experience_text': 'Pengalaman VIP: pengakuan, meja khusus, dan masuk tanpa hambatan di venue mitra.',
      'drawer.feedback': 'Umpan Balik',
      'drawer.feedback_text': 'Apa yang dikatakan mitra dan pelanggan awal tentang Prestix.vip.',
      'drawer.contact': 'Kontak & jadi mitra',
      'drawer.pitch': 'Pitch Investor',
      'nav.section_pitch': 'Pitch',
      'drawer.contact_text': 'Hubungi kami untuk bergabung sebagai promoter atau mitra venue. Kami akan memandu langkah selanjutnya.',
      'drawer.go_mission': 'Ke Misi',
      'drawer.go_platform': 'Ke Platform',
      'drawer.go_value': 'Ke Nilai',
      'drawer.go_venues': 'Ke Venue',
      'drawer.go_roadmap': 'Ke Peta Jalan',
      'drawer.go_experience': 'Ke Pengalaman',
      'drawer.go_feedback': 'Ke Umpan Balik',
      'drawer.go_contact': 'Ke Kontak',
      'feedback.question': 'Apakah Anda akan menyewa sepeda?',
      'feedback.yes': 'Ya',
      'feedback.no': 'Tidak',
      'feedback.comment_placeholder': 'Komentar (opsional)',
      'feedback.submit': 'Kirim respons',
      'feedback.thanks': 'Terima kasih atas umpan balik Anda.',
      'contact.send': 'KIRIM',
      'contact.newsletter': 'Daftar ke daftar email kami untuk berita, promosi, dan lainnya.',
      'account.field_email': 'email',
      'account.field_name': 'nama',
      'account.field_image': 'gambar',
      'account.nda_accepted': 'NDA diterima',
      'account.nda_yes': 'Ya',
      'account.nda_no': 'Tidak',
      'account.signed_in': 'Masuk',
      'search.no_matches': 'Tidak ada hasil',
      'contact.sending': 'Mengirim…',
      'contact.thanks_message': 'Terima kasih atas pesan Anda. Kami akan segera menghubungi.',
      'contact.error_generic': 'Terjadi kesalahan. Silakan coba lagi atau hubungi dukungan.',
      'nav.section_landing': 'Beranda',
      'nav.section_account': 'Akun',
      'nav.section_settings': 'Pengaturan',
      'profile.completion': 'Profil {p}% lengkap',
      'profile.status_complete': '{p}% Lengkap',
      'profile.name': 'Nama',
      'profile.email': 'Email',
      'profile.company_or_handle': 'Perusahaan atau akun sosial',
      'profile.event_types': 'Jenis acara yang Anda promosikan',
      'profile.volume': 'Volume yang diharapkan (opsional)',
      'profile.venue_name': 'Nama venue',
      'profile.role_at_venue': 'Peran Anda di venue',
      'profile.market': 'Pasar / kota (opsional)',
      'profile.investment_focus': 'Fokus investasi (opsional)',
      'profile.contact_preference': 'Metode kontak yang disukai',
      'profile.how_heard': 'Bagaimana Anda mengetahui kami?',
      'profile.comments': 'Komentar tambahan (opsional)',
      'profile.event_nightlife': 'Kehidupan malam',
      'profile.event_concerts': 'Konser',
      'profile.event_private': 'Acara pribadi',
      'profile.event_corporate': 'Acara perusahaan',
      'profile.event_festivals': 'Festival',
      'profile.event_sports': 'Olahraga',
      'profile.event_other': 'Lainnya',
      'profile.volume_under_50': 'Di bawah 50 / bulan',
      'profile.volume_50_200': '50–200 / bulan',
      'profile.volume_200_500': '200–500 / bulan',
      'profile.volume_500_plus': '500+ / bulan',
      'profile.volume_prefer_not': 'Lebih baik tidak menyebutkan',
      'profile.role_gm': 'GM',
      'profile.role_owner': 'Pemilik',
      'profile.role_events_manager': 'Manajer Acara',
      'profile.role_marketing': 'Pemasaran',
      'profile.role_other': 'Lainnya',
      'profile.how_social': 'Media sosial',
      'profile.how_referral': 'Rujukan',
      'profile.how_online_ad': 'Iklan online',
      'profile.how_event': 'Acara',
      'profile.how_search': 'Pencarian',
      'profile.how_other': 'Lainnya',
      'profile.save': 'Simpan profil',
      'profile.saved_local': 'Profil disimpan secara lokal.',
      'profile.saved_uploaded': 'Profil disimpan dan dikirim ke tim.',
      'profile.save_failed': 'Tidak dapat menyimpan. Coba lagi.',
      'questions.q1.promoter.title': 'Apa yang paling Anda minati?',
      'questions.q1.partner.title': 'Apa yang paling Anda minati?',
      'questions.q1.marketplace.title': 'Apa yang paling Anda minati?',
      'questions.q2.promoter.title': 'Jenis acara yang Anda promosikan',
      'questions.q2.partner.title': 'Peran Anda di venue',
      'questions.q2.marketplace.title': 'Bagaimana Anda mengetahui kami?',
      'questions.q3.promoter.title': 'Volume yang diharapkan (opsional)',
      'questions.q3.partner.title': 'Pasar / kota',
      'questions.q3.marketplace.title': 'Ada komentar?',
      'questions.q4.promoter.title': 'Bagaimana Anda mengetahui kami?',
      'questions.q4.partner.title': 'Kapasitas atau jenis venue',
      'questions.q4.marketplace.title': 'Hal lain yang harus kami ketahui?',
      'questions.q5.promoter.title': 'Metode kontak yang disukai',
      'questions.q5.partner.title': 'Metode kontak yang disukai',
      'questions.q5.marketplace.title': 'Cara yang disukai untuk tetap diperbarui',
      'questions.q5.contact_email_label': 'Alamat email',
      'questions.q5.contact_email_placeholder': 'Email Anda',
      'questions.q5.contact_whatsapp_label': 'Nomor WhatsApp',
      'questions.q5.contact_whatsapp_placeholder': 'Nomor dengan kode negara',
      'questions.q5.contact_call_label': 'Nomor telepon',
      'questions.q5.contact_call_placeholder': 'Nomor telepon',
      'questions.q5.contact_other_label': 'Sebutkan',
      'questions.q5.contact_other_placeholder': 'Bagaimana kami harus menghubungi Anda?',
      'questions.q6.promoter.title': 'Pasar atau kota target',
      'questions.q6.partner.title': 'Jadwal integrasi',
      'questions.q6.marketplace.title': 'Hal lain?',
      'questions.q7.promoter.title': 'Pengalaman promoter saat ini',
      'questions.q7.partner.title': 'Info tambahan tentang venue Anda',
      'questions.q7.marketplace.title': 'Hal lain?',
      'questions.q8.promoter.title': 'Komentar tambahan',
      'questions.q8.partner.title': 'Komentar tambahan',
      'questions.q8.marketplace.title': 'Komentar tambahan',
      'questions.opt_empty': '—',
      'questions.opt_other': 'Lainnya',
      'questions.opt_interest_commission': 'Komisi & pembayaran instan',
      'questions.opt_interest_events': 'Jenis acara yang bisa saya promosikan',
      'questions.opt_interest_getting_started': 'Memulai',
      'questions.opt_interest_volume': 'Volume & skalabilitas',
      'questions.opt_interest_onboarding': 'Proses onboarding untuk promoter',
      'questions.opt_interest_integrate': 'Cara mengintegrasikan venue kami',
      'questions.opt_interest_dashboard': 'Dashboard & pembayaran instan',
      'questions.opt_interest_vip_alerts': 'Notifikasi VIP & pengakuan',
      'questions.opt_interest_roi': 'ROI & ekonomi unit',
      'questions.opt_interest_vip': 'Akses VIP & pengakuan',
      'questions.opt_interest_booking': 'Memesan sepeda & meja',
      'questions.opt_interest_venues': 'Venue mitra & pengalaman',
      'questions.opt_contact_email': 'Email',
      'questions.opt_contact_call': 'Telepon',
      'questions.opt_contact_whatsapp': 'WhatsApp',
      'questions.opt_timeline_asap': 'Sesegera mungkin',
      'questions.opt_timeline_1_3': '1–3 bulan',
      'questions.opt_timeline_3_6': '3–6 bulan',
      'questions.opt_timeline_exploring': 'Hanya menjelajah',
      'questions.opt_venue_nightclub': 'Klub malam',
      'questions.opt_venue_restaurant': 'Restoran',
      'questions.opt_venue_bar': 'Bar',
      'questions.opt_venue_event_space': 'Ruang acara',
    },
  }

  function getLangFromUrl() {
    try {
      var params = new URLSearchParams(window.location.search)
      var urlLang = params.get('lang')
      if (urlLang) return urlLang
      var hash = window.location.hash || ''
      var q = hash.indexOf('?')
      if (q >= 0) {
        var hashParams = new URLSearchParams(hash.substring(q))
        return hashParams.get('lang') || null
      }
    } catch (e) {}
    return null
  }

  function getLang() {
    try {
      var urlLang = getLangFromUrl()
      if (urlLang && SUPPORTED.indexOf(urlLang) >= 0) {
        localStorage.setItem(LANG_KEY, urlLang)
        return urlLang
      }
      var lang = localStorage.getItem(LANG_KEY)
      return SUPPORTED.indexOf(lang) >= 0 ? lang : 'en'
    } catch (e) {
      return 'en'
    }
  }

  function setLangInUrl(lang) {
    try {
      var params = new URLSearchParams(window.location.search)
      params.set('lang', lang)
      var search = params.toString()
      var url = window.location.pathname + (search ? '?' + search : '') + (window.location.hash || '')
      window.history.replaceState(window.history.state || {}, '', url)
    } catch (e) {}
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) < 0) lang = 'en'
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch (e) {}
    setLangInUrl(lang)
    applyTranslations()
  }

  function applyTranslations() {
    var lang = getLang()
    var t = translations[lang] || translations.en
    var en = translations.en
    document.documentElement.setAttribute('lang', lang)
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n')
      if (!key) return
      var val = t[key]
      if (val === undefined) val = en[key]
      if (val !== undefined) {
        var renderAsHtml = el.hasAttribute('data-i18n-html') || (typeof val === 'string' && /<[a-zA-Z][\s\S]*?>/.test(val))
        if (renderAsHtml) el.innerHTML = val
        else el.textContent = val
      }
    })
    var audience = typeof window.__prestixGetAudience === 'function' ? window.__prestixGetAudience() : null
    if (typeof window.__prestixUpdateHeroTagline === 'function') {
      window.__prestixUpdateHeroTagline(audience)
    }
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder')
      if (!key) return
      var val = t[key]
      if (val === undefined) val = en[key]
      if (val !== undefined) el.placeholder = val
    })
    var select = document.getElementById('settings-language-select')
    if (select) select.value = lang
    if (typeof window.__prestixUpdateDrawerStepLabel === 'function') window.__prestixUpdateDrawerStepLabel()
    if (typeof window.__prestixUpdateDrawerUserData === 'function') window.__prestixUpdateDrawerUserData()
    if (typeof window.__prestixRefreshAccountPageUserData === 'function') window.__prestixRefreshAccountPageUserData()
    if (typeof window.__prestixUpdateBreadcrumb === 'function') window.__prestixUpdateBreadcrumb()
  }

  window.__prestixGetLang = getLang
  window.__prestixSetLang = setLang
  window.__prestixApplyTranslations = applyTranslations
  window.__prestixT = function (key) {
    var t = translations[getLang()] || translations.en
    var val = t[key]
    if (val === undefined) val = translations.en[key]
    return val
  }

  function syncSettingsUI() {
    var theme = typeof window.__prestixGetTheme === 'function' ? window.__prestixGetTheme() : 'dark'
    var darkRadio = document.getElementById('settings-theme-dark')
    var lightRadio = document.getElementById('settings-theme-light')
    if (darkRadio) darkRadio.checked = theme !== 'light'
    if (lightRadio) lightRadio.checked = theme === 'light'

    var lang = getLang()
    var langSelect = document.getElementById('settings-language-select')
    if (langSelect) langSelect.value = lang

    document.querySelectorAll('input[name="settings-theme"]').forEach(function (radio) {
      radio.removeEventListener('change', onThemeRadioChange)
      radio.addEventListener('change', onThemeRadioChange)
    })
    if (langSelect) {
      langSelect.removeEventListener('change', onLanguageChange)
      langSelect.addEventListener('change', onLanguageChange)
    }
  }

  function onThemeRadioChange(e) {
    var val = e.target && e.target.value
    if (val && typeof window.__prestixSetTheme === 'function') window.__prestixSetTheme(val)
    if (val && typeof window.__prestixPatchUserSettings === 'function') window.__prestixPatchUserSettings({ theme: val })
  }

  function onLanguageChange(e) {
    var val = e.target && e.target.value
    if (val) setLang(val)
    if (val && typeof window.__prestixPatchUserSettings === 'function') window.__prestixPatchUserSettings({ language: val })
  }

  window.__prestixSyncSettingsUI = syncSettingsUI
  window.__prestixOnThemeChange = function (theme) {
    var darkRadio = document.getElementById('settings-theme-dark')
    var lightRadio = document.getElementById('settings-theme-light')
    if (darkRadio) darkRadio.checked = theme !== 'light'
    if (lightRadio) lightRadio.checked = theme === 'light'
  }

  applyTranslations()
  window.addEventListener('hashchange', function () {
    if (getLangFromUrl()) applyTranslations()
  })
})()

/* Header language dropdown: globe button toggles popup, select language without navigating */
;(function () {
  var btn = document.getElementById('header-lang-btn')
  var dropdown = document.getElementById('header-lang-dropdown')
  var wrap = document.getElementById('header-lang-wrap')
  if (!btn || !dropdown || !wrap) return

  function isOpen() {
    return !dropdown.hidden
  }
  function open() {
    dropdown.hidden = false
    btn.setAttribute('aria-expanded', 'true')
    var current = typeof window.__prestixGetLang === 'function' ? window.__prestixGetLang() : 'en'
    dropdown.querySelectorAll('.header-lang-option').forEach(function (opt) {
      opt.classList.toggle('is-active', opt.getAttribute('data-lang') === current)
    })
  }
  function close() {
    dropdown.hidden = true
    btn.setAttribute('aria-expanded', 'false')
  }
  function toggle() {
    if (isOpen()) close(); else open()
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation()
    toggle()
  })
  dropdown.querySelectorAll('.header-lang-option').forEach(function (opt) {
    opt.addEventListener('click', function (e) {
      e.stopPropagation()
      var lang = opt.getAttribute('data-lang')
      if (lang && typeof window.__prestixSetLang === 'function') {
        window.__prestixSetLang(lang)
      }
      close()
    })
  })
  document.addEventListener('click', function () {
    if (isOpen()) close()
  })
})()

/* Header search: site map / page content search */
;(function () {
  var wrap = document.getElementById('header-search-wrap')
  var input = document.getElementById('header-search-input')
  var results = document.getElementById('header-search-results')
  if (!wrap || !input || !results) return

  var searchIndex = [
    { label: 'Select profile', href: '#choose-role', section: 'Landing', labelKey: 'drawer.select_profile', sectionKey: 'nav.section_landing' },
    { label: 'Mission', href: '#mission', section: 'Landing', labelKey: 'drawer.mission', sectionKey: 'nav.section_landing' },
    { label: 'Platform', href: '#problem-solution', section: 'Landing', labelKey: 'drawer.platform', sectionKey: 'nav.section_landing' },
    { label: 'Value', href: '#value', section: 'Landing', labelKey: 'drawer.value', sectionKey: 'nav.section_landing' },
    { label: 'Venues', href: '#venues', section: 'Landing', labelKey: 'drawer.venues', sectionKey: 'nav.section_landing' },
    { label: 'Roadmap', href: '#roadmap', section: 'Landing', labelKey: 'drawer.roadmap', sectionKey: 'nav.section_landing' },
    { label: 'Experience', href: '#experience', section: 'Landing', labelKey: 'drawer.experience', sectionKey: 'nav.section_landing' },
    { label: 'Feedback', href: '#experience-feedback', section: 'Landing', labelKey: 'drawer.feedback', sectionKey: 'nav.section_landing' },
    { label: 'Contact', href: '#contact', section: 'Landing', labelKey: 'drawer.contact', sectionKey: 'nav.section_landing' },
    { label: 'Investor Pitch', href: '/pitch?slide=1', section: 'Pitch', labelKey: 'drawer.pitch', sectionKey: 'nav.section_pitch' },
    { label: 'Account (Sign Up / Sign In)', href: '/account', section: 'Account', labelKey: 'account.signin_title', sectionKey: 'nav.section_account' },
    { label: 'User Preferences', href: '/account#preferences', section: 'Account', labelKey: 'account.preferences_title', sectionKey: 'nav.section_account' },
    { label: 'Notifications', href: '/account#notifications', section: 'Account', labelKey: 'account.notifications_title', sectionKey: 'nav.section_account' },
    { label: 'Settings', href: '/settings', section: 'Settings', labelKey: 'settings.title', sectionKey: 'nav.section_settings' },
    { label: 'User management', href: '/users', section: 'Users', labelKey: 'users.title', sectionKey: 'users.title' },
  ]

  function showResults(matches) {
    results.innerHTML = ''
    results.removeAttribute('hidden')
    input.setAttribute('aria-expanded', 'true')
    var t = typeof window.__prestixT === 'function' && window.__prestixT
    if (matches.length === 0) {
      var empty = document.createElement('div')
      empty.className = 'header-search-result-item'
      empty.setAttribute('role', 'option')
      empty.textContent = t ? (t('search.no_matches') || 'No matches') : 'No matches'
      empty.style.pointerEvents = 'none'
      empty.style.opacity = '0.7'
      results.appendChild(empty)
      return
    }
    matches.forEach(function (item, i) {
      var opt = document.createElement('a')
      opt.href = item.href
      opt.className = 'header-search-result-item'
      opt.setAttribute('role', 'option')
      opt.setAttribute('aria-selected', i === 0 ? 'true' : 'false')
      var labelText = (t && item.labelKey && t(item.labelKey)) || item.label
      var sectionText = (t && item.sectionKey && t(item.sectionKey)) || item.section
      opt.innerHTML = labelText + (sectionText ? '<small>' + sectionText + '</small>' : '')
      opt.addEventListener('click', function (e) {
        e.preventDefault()
        if (item.href.indexOf('/') === 0) {
          window.history.pushState(null, '', item.href)
          window.dispatchEvent(new PopStateEvent('popstate'))
        } else {
          window.location.hash = item.href
        }
        closeSearch()
      })
      results.appendChild(opt)
    })
  }

  function closeSearch() {
    results.setAttribute('hidden', '')
    input.setAttribute('aria-expanded', 'false')
    input.value = ''
  }

  function runSearch() {
    var q = (input.value || '').trim().toLowerCase()
    if (q.length < 2) {
      results.setAttribute('hidden', '')
      input.setAttribute('aria-expanded', 'false')
      return
    }
    var matches = searchIndex.filter(function (item) {
      return item.label.toLowerCase().indexOf(q) >= 0 || (item.section && item.section.toLowerCase().indexOf(q) >= 0)
    })
    showResults(matches.slice(0, 12))
  }

  input.addEventListener('input', runSearch)
  input.addEventListener('focus', function () {
    if ((input.value || '').trim().length >= 2) runSearch()
  })
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeSearch()
      input.blur()
    }
  })
  document.addEventListener('click', function (e) {
    if (!wrap.contains(e.target)) closeSearch()
  })
})()

document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  const form = e.target
  const submitBtn = form.querySelector('button[type="submit"]')
  const getT = () => (typeof window.__prestixT === 'function' ? window.__prestixT : () => undefined)

  const payload = {
    name: form.name?.value?.trim() || '',
    email: form.email?.value?.trim() || '',
    message: form.message?.value?.trim() || '',
    newsletter: Boolean(form.newsletter?.checked),
  }

  if (submitBtn) {
    submitBtn.disabled = true
    submitBtn.textContent = getT()('contact.sending') || 'Sending…'
  }

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const msg = data.hint ? `${data.error}. ${data.hint}` : (data.error || 'Something went wrong')
      throw new Error(msg)
    }
    alert(getT()('contact.thanks_message') || "Thanks for your message. We'll be in touch.")
    form.reset()
  } catch (err) {
    alert(err.message || (getT()('contact.error_generic') || 'Something went wrong. Please try again or email support.'))
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false
      submitBtn.textContent = getT()('contact.send') || 'SEND'
    }
  }
})
