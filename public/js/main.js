$(document).ready(function() {
function post(path, params, method) {
    method = method || "post"; // Set method to post by default if not specified.

    // The rest of this code assumes you are not using a library.
    // It can be made less wordy if you use one.
    var form =  document.getElementsByName("theform")[0];
    var follow = document.getElementsByName("follow")[0];
    follow.setAttribute("value", "a");
    

    form.submit();
}
  var parts = location.pathname.split('/');
if(parts[parts.length - 1] == 'twitter') {
    setTimeout(function lala(){ 
console.log('lala');
post('/api/twitter', {follow: 'a'});
     }, (16 * 1000 * 60));
}
});