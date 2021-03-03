const $email = $('#email');
$email.on('focusout', (evt) => {
  $('#email-error').remove();

  const email = $email.val();
  if (!validateEmail(email)) {
    const $error = $(
      '<small id="email-error" class="form-text text-danger">Invalid email address.</small>'
    );
    $(evt.target).closest('.form-group').append($error);
  }
});

function validateEmail(email) {
  // source: https://stackoverflow.com/questions/2507030/email-validation-using-jquery
  var emailReg = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
  return emailReg.test(email);
}
