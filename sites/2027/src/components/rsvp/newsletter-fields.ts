// The "Email me news!" extra on the RSVP form: ticking it uses the account's
// email, and "change me" opens a field for another address. Validation for
// that field is inline, in place of the browser's bubble.
for (const form of document.querySelectorAll<HTMLFormElement>(
	"[data-rsvp-form]",
)) {
	const newsCheckbox = form.querySelector<HTMLInputElement>("#subscribe-news");
	const accountNote = form.querySelector<HTMLElement>("[data-note-account]");
	const otherNote = form.querySelector<HTMLElement>("[data-note-other]");
	const changeEmailButton = form.querySelector<HTMLButtonElement>(
		"[data-change-email]",
	);
	// One in the note, one inside the "add an email" error.
	const useAccountButtons = form.querySelectorAll<HTMLButtonElement>(
		"[data-use-account-email]",
	);
	const newsletterOptions = form.querySelector<HTMLElement>(
		"#newsletter-options",
	);
	const alternateEmail =
		form.querySelector<HTMLInputElement>("#alternate-email");
	const emailError = form.querySelector<HTMLElement>("#alternate-email-error");
	const missingError = form.querySelector<HTMLElement>("[data-error-missing]");
	const invalidError = form.querySelector<HTMLElement>("[data-error-invalid]");
	if (
		!newsCheckbox ||
		!accountNote ||
		!otherNote ||
		!changeEmailButton ||
		!newsletterOptions ||
		!alternateEmail ||
		!emailError ||
		!missingError ||
		!invalidError
	) {
		continue;
	}

	let wantsOtherEmail = false;
	const showError = () => {
		const missing = alternateEmail.validity.valueMissing;
		missingError.hidden = !missing;
		invalidError.hidden = missing;
		emailError.hidden = false;
		alternateEmail.setAttribute("aria-invalid", "true");
	};
	const clearError = () => {
		emailError.hidden = true;
		alternateEmail.removeAttribute("aria-invalid");
	};
	const syncNewsletterFields = () => {
		const showOther = newsCheckbox.checked && wantsOtherEmail;
		accountNote.hidden = showOther;
		otherNote.hidden = !showOther;
		newsletterOptions.hidden = !showOther;
		// Disabled fields skip validation and aren't submitted, so a
		// tucked-away address can't block the RSVP or replace the account's.
		alternateEmail.disabled = !showOther;
		if (!showOther) clearError();
	};

	newsCheckbox.addEventListener("change", () => {
		// Unticking falls back to the account email; whatever they typed
		// stays in the field for the next "change me".
		if (!newsCheckbox.checked) wantsOtherEmail = false;
		syncNewsletterFields();
	});
	changeEmailButton.addEventListener("click", () => {
		newsCheckbox.checked = true;
		wantsOtherEmail = true;
		syncNewsletterFields();
		alternateEmail.focus();
	});
	for (const button of useAccountButtons) {
		button.addEventListener("click", () => {
			wantsOtherEmail = false;
			syncNewsletterFields();
			// The note's spot now offers "change me", so focus lands there.
			changeEmailButton.focus();
		});
	}
	// Complain only once they've left the field, and stop as soon as they
	// start fixing it.
	alternateEmail.addEventListener("blur", () => {
		if (alternateEmail.value && !alternateEmail.validity.valid) showError();
	});
	alternateEmail.addEventListener("input", clearError);
	// Submitting with a bad address trips native validation; cancelling it
	// swaps the browser's bubble for the inline message.
	alternateEmail.addEventListener("invalid", (event) => {
		event.preventDefault();
		showError();
		// Leave focus to the browser when the handle is the first problem.
		if (form.querySelector(":invalid") === alternateEmail) {
			alternateEmail.focus();
		}
	});
	syncNewsletterFields();
}
