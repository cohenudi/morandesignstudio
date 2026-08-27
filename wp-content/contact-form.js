/* ---------------------------------------------------------------
   Static-mirror contact form handler
   ---------------------------------------------------------------
   The footer contact form is an Elementor Pro form widget. Elementor
   submits it over AJAX to /wp-admin/admin-ajax.php, which no longer
   exists once the WordPress site is gone - so the form would accept a
   submission and silently drop it.

   This sends the same fields to Formspree instead and reports the
   result in place, so the visible behaviour is unchanged.

   SETUP: replace ENDPOINT below with your own Formspree endpoint
   (Formspree -> your form -> "Your form's endpoint").
   Until that is done the form does not pretend to work: it shows the
   direct email + WhatsApp details instead of dropping the message.
   --------------------------------------------------------------- */
(function () {
	'use strict';

	var ENDPOINT = 'https://formspree.io/f/REPLACE_WITH_FORM_ID';

	var EMAIL = 'morani.cohen@gmail.com';
	var WHATSAPP = '052-333-7726';

	// name="form_fields[x]" -> the label used in the notification email
	var LABELS = {
		name: 'שם',
		email: 'אימייל',
		field_32e6f24: 'טלפון',
		message: 'הודעה'
	};

	var TEXT = {
		sending: 'שולח…',
		success: 'תודה! ההודעה נשלחה, אחזור אליך בהקדם.',
		error: 'משהו נתקע בשליחה. אפשר לנסות שוב, או ליצור קשר ישירות:',
		unconfigured: 'טופס ההתקשרות בהקמה. בינתיים אפשר ליצור קשר ישירות:'
	};

	function isConfigured() {
		return ENDPOINT.indexOf('REPLACE_WITH_FORM_ID') === -1;
	}

	function contactFallback() {
		return '<div class="mirror-form-notice">' +
			'<a href="mailto:' + EMAIL + '">' + EMAIL + '</a><br>' +
			'<a href="https://api.whatsapp.com/send?phone=972523337726">' + WHATSAPP + ' — ווטסאפ</a>' +
			'</div>';
	}

	function showMessage(form, html) {
		var wrapper = form.querySelector('.elementor-form-fields-wrapper');
		(wrapper || form).innerHTML = '<div class="mirror-form-message">' + html + '</div>';
	}

	function collect(form) {
		var payload = {};
		var fields = form.querySelectorAll('[name^="form_fields["]');
		for (var i = 0; i < fields.length; i++) {
			var key = fields[i].name.replace(/^form_fields\[/, '').replace(/\]$/, '');
			var value = (fields[i].value || '').trim();
			if (!value) continue;
			payload[LABELS[key] || key] = value;
			if (key === 'email') {
				// lets Formspree set the notification's Reply-To
				payload.email = value;
				payload._replyto = value;
			}
		}
		payload._subject = 'פנייה חדשה מהאתר';
		// Elementor already records which page the form was submitted from
		var referer = form.querySelector('[name="referer_title"]');
		payload['נשלח מהעמוד'] = (referer && referer.value) || document.title;
		payload['כתובת העמוד'] = window.location.href;
		return payload;
	}

	function onSubmit(event) {
		var form = event.target;
		if (!form || !form.classList || !form.classList.contains('elementor-form')) return;

		// Elementor Pro binds its own submit handler directly on the form.
		// Listening on document in the CAPTURE phase means this runs first,
		// and stopImmediatePropagation keeps the event from ever reaching it.
		event.preventDefault();
		event.stopImmediatePropagation();

		if (!isConfigured()) {
			showMessage(form, TEXT.unconfigured + contactFallback());
			return;
		}

		var button = form.querySelector('button[type="submit"]');
		var label = button && button.querySelector('.elementor-button-text');
		var original = label ? label.textContent : null;
		if (button) button.disabled = true;
		if (label) label.textContent = TEXT.sending;

		function fail() {
			if (button) button.disabled = false;
			if (label && original !== null) label.textContent = original;
			var wrapper = form.querySelector('.elementor-form-fields-wrapper');
			var existing = form.querySelector('.mirror-form-error');
			if (existing) existing.remove();
			var box = document.createElement('div');
			box.className = 'mirror-form-error';
			box.innerHTML = TEXT.error + contactFallback();
			(wrapper || form).appendChild(box);
		}

		fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
			body: JSON.stringify(collect(form))
		}).then(function (response) {
			if (response.ok) showMessage(form, TEXT.success);
			else fail();
		}).catch(fail);
	}

	document.addEventListener('submit', onSubmit, true);
})();
