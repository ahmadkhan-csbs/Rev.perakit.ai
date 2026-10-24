# Waitlist form ko LIVE karna (₹0, bina backend ke)

**Problem:** Landing page ka waitlist form abhi sirf visitor ke browser ke `localStorage` me save hota hai.
Matlab agar tum temp link doston ko bhejoge, unke signup **tum tak kabhi nahi pahunchenge**.

**Fix (2 options, dono ₹0):**

## Option A — FormSubmit (fastest, koi signup nahi)
1. Apna email do (jahan signup entries aani chahiye).
2. Main `landing/index.html` me ye patch laga dunga — form submit hote hi entry tumhare email par aa jayegi, saath me localStorage backup bhi rahega:
```js
// Waitlist form — email capture (FormSubmit, free, no signup) + localStorage backup
const key='rev_waitlist';
const WL_EMAIL='TUMHARA-EMAIL-YAHAN'; // <-- Ahmad ka email aayega
document.getElementById('wlform').addEventListener('submit',e=>{
  e.preventDefault();
  const v={name:name.value,contact:contact.value,role:role.value,exp:exp.value,ts:new Date().toISOString()};
  const arr=JSON.parse(localStorage.getItem(key)||'[]'); arr.push(v); localStorage.setItem(key,JSON.stringify(arr));
  fetch('https://formsubmit.co/ajax/'+encodeURIComponent(WL_EMAIL),{
    method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({name:v.name,_subject:'🦜 Rev waitlist: '+v.name,contact:v.contact,role:v.role,experience:v.exp,submitted_at:v.ts})
  }).catch(()=>{});
  document.getElementById('wlform').style.display='none'; document.getElementById('wlsuccess').style.display='block';
  document.getElementById('wlcount').textContent='Ab tak '+arr.length+' log waitlist me hain (is device par).';
});
```
3. Pehla signup aate hi FormSubmit tumhe **ek activation email** bhejega — us link par click karna (sirf ek baar). Uske baad har signup seedha inbox me.

## Option B — Google Form (tum khud 2 min me)
1. forms.google.com → blank form → fields: Name, Email/WhatsApp, Role, Experience.
2. Form ka link do — main landing page ke "Join the Waitlist" button ko us link par point kar dunga.
3. Responses Google Sheet me auto-collect honge.

**Recommendation:** Option A — page ka look same rahega, aur permanent deploy ke baad DB wiring isi form ke upar hogi.

_Status: pending Ahmad's email (Option A) ya form link (Option B)._
