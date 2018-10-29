$(document).ready(function() {

  var parts = location.pathname.split('/');
if(parts[parts.length - 1] == 'twitter') {
	console.log('lala1');
    setTimeout(function lala(){ 
console.log('lala2');
 var form =  document.getElementsByName("theform")[0];
 form.submit();
     }, Math.random() * 60 * 60 * 1000);
}
});