/* ============ ÉTAPE 1 : colle ici la configuration Firebase (voir les explications) ============ */
const FIREBASE_CONFIG={
  apiKey:"AIzaSyDp9uXc6cg87Ybn2cx0top4Vc9POyGr5RE",
  authDomain:"calendrier-af9c4.firebaseapp.com",
  projectId:"calendrier-af9c4",
  storageBucket:"calendrier-af9c4.firebasestorage.app",
  messagingSenderId:"1069386067244",
  appId:"1:1069386067244:web:bce96eab6f759b58d69089"
};
/* ================================================================================================ */

/* ============ À MODIFIER : la liste des personnes et leurs couleurs ============
   - id    : un identifiant unique, SANS espace ni accent. Ne le change jamais après coup.
   - name  : le nom affiché.
   - color : la couleur (code hexadécimal, texte blanc lisible dessus).
   Pour ajouter quelqu’un : copie une ligne, change l’id, le nom et la couleur. */
const PEOPLE=[
  {id:"personne1",name:"Yvette & Célestin",color:"#e4572e"},
  {id:"personne2",name:"Lucia",color:"#2f6fed"},
  {id:"personne3",name:"Edouard & Pina",color:"#16a34a"},
  {id:"personne4",name:"Rose",color:"#c026d3"},
  {id:"personne5",name:"Mario & Pina: 10h30-12h",color:"#d97706"},
  {id:"personne6",name:"Claude & Jeanou",color:"#0891b2"},
  {id:"personne7",name:"Dominique",color:"#78350f"},
  {id:"personne8",name:"Jean-Claude",color:"#475569"},
  {id:"personne9",name:"Steve",color:"#4d7c0f"},
  {id:"personne10",name:"Antoinette",color:"#4338ca"},
  {id:"personne11",name:"Nino",color:"#881337"},
  {id:"personne12",name:"Nicole",color:"#ec4899"}
];
/* ================================================================================ */

let fb=null,uid=null,myName="",online=false,visits=[],view=new Date(),sel=null;
view=new Date(view.getFullYear(),view.getMonth(),1);
const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,"0");
const key=(y,m,d)=>y+"-"+pad(m+1)+"-"+pad(d);
const has=(k,pid)=>visits.some(v=>v.date===k&&v.personId===pid);
function el(t,c,txt){const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e}
function banner(t){$("banner").textContent=t}
function fail(){banner("Impossible d’enregistrer. Vérifie ta connexion internet et réessaie.")}

function render(){
  const pre=view.getFullYear()+"-"+pad(view.getMonth()+1)+"-";
  $("mlabel").textContent=view.toLocaleDateString("fr-BE",{month:"long",year:"numeric"});
  const mv=visits.filter(v=>v.date&&v.date.startsWith(pre));
  const done=PEOPLE.filter(p=>mv.some(v=>v.personId===p.id)).length;
  $("stat").textContent=done+" sur "+PEOPLE.length+" personne"+(PEOPLE.length>1?"s":"")+" visitée"+(done>1?"s":"")+" ce mois-ci";
  const chips=$("chips");chips.replaceChildren();
  PEOPLE.forEach(p=>{
    const c=el("div","chip");c.style.background=p.color;
    c.append(el("span",null,p.name));if(mv.some(v=>v.personId===p.id))c.append(el("small",null,"✓ visité"));
    chips.append(c);
  });
  const g=$("grid");g.replaceChildren();
  ["lun","mar","mer","jeu","ven","sam","dim"].forEach(w=>g.append(el("div","wd",w)));
  const y=view.getFullYear(),m=view.getMonth(),off=(new Date(y,m,1).getDay()+6)%7,n=new Date(y,m+1,0).getDate();
  const t=new Date(),tk=key(t.getFullYear(),t.getMonth(),t.getDate());
  for(let i=0;i<off;i++)g.append(el("div","day off"));
  for(let d=1;d<=n;d++){
    const k=key(y,m,d),b=el("button","day"+(k===tk?" today":"")+(k===sel?" sel":""));
    b.append(el("b",null,d));
    PEOPLE.filter(p=>has(k,p.id)).forEach(p=>{const tg=el("span","tag",p.name);tg.style.background=p.color;b.append(tg)});
    b.onclick=()=>{sel=k;render()};
    g.append(b);
  }
  renderSheet();
}

function renderSheet(){
  $("sheet").hidden=!sel;$("main").className=sel?"open":"";
  if(!sel)return;
  const [y,m,d]=sel.split("-").map(Number);
  $("sdate").textContent=new Date(y,m-1,d).toLocaleDateString("fr-BE",{weekday:"long",day:"numeric",month:"long"});
  const box=$("pbs");box.replaceChildren();
  PEOPLE.forEach(p=>{
    const on=has(sel,p.id),other=on&&online&&!visits.some(v=>v.date===sel&&v.personId===p.id&&v.uid===uid);
    const who=visits.filter(v=>v.date===sel&&v.personId===p.id).map(v=>v.by).filter(Boolean).join(", ");
    const b=el("button","pb"+(on?" on":""),(on?"✓ ":"")+p.name+(on&&who?" · "+who:"")+(other&&!who?" (coché par un autre)":""));
    b.style.borderColor=p.color;if(on)b.style.background=p.color;
    if(other){b.disabled=true;b.style.opacity=".6"}
    b.setAttribute("aria-pressed",on);
    b.onclick=()=>toggle(sel,p.id);
    box.append(b);
  });
}

function localSave(){try{localStorage.setItem("visites",JSON.stringify(visits))}catch(e){}}
async function toggle(k,pid){
  banner("");
  const found=visits.filter(v=>v.date===k&&v.personId===pid);
  try{
    if(online){
      if(!uid){banner("Connexion impossible : active l’authentification anonyme dans Firebase.");return}
      if(found.length){
        const mine=found.filter(v=>v.uid===uid);
        if(!mine.length){banner("Cette visite a été cochée par "+(found[0].by||"quelqu’un d’autre")+" : seule cette personne peut l’annuler.");return}
        await Promise.all(mine.map(v=>fb.deleteDoc(fb.doc(fb.db,"visits",v.id))));
      }else{
        if(!myName){banner("Écris d’abord ton prénom dans la case, au-dessus des noms.");document.getElementById("myname").focus();return}
        await fb.setDoc(fb.doc(fb.db,"visits",k+"_"+pid),{date:k,personId:pid,uid:uid,by:myName});
      }
    }else{
      if(found.length)visits=visits.filter(v=>!(v.date===k&&v.personId===pid));
      else{
        if(!myName){banner("Écris d’abord ton prénom dans la case, au-dessus des noms.");document.getElementById("myname").focus();return}
        visits.push({id:k+"_"+pid,date:k,personId:pid,by:myName});
      }
      localSave();render();
    }
  }catch(_){fail()}
}

$("sclose").onclick=()=>{sel=null;render()};
$("prev").onclick=()=>{view=new Date(view.getFullYear(),view.getMonth()-1,1);sel=null;render()};
$("next").onclick=()=>{view=new Date(view.getFullYear(),view.getMonth()+1,1);sel=null;render()};

async function init(){
  render();
  const nm=el("input");nm.id="myname";nm.placeholder="Ton prénom";nm.maxLength=30;nm.setAttribute("aria-label","Ton prénom");
  nm.style.cssText="width:100%;padding:10px 12px;margin:8px 0;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font:inherit";
  try{nm.value=localStorage.getItem("prenom")||""}catch(e){}
  myName=nm.value.trim();
  nm.oninput=()=>{myName=nm.value.trim();try{localStorage.setItem("prenom",myName)}catch(e){}};
  $("pbs").before(nm);
  if(FIREBASE_CONFIG.apiKey==="COLLE_ICI"){
    try{visits=JSON.parse(localStorage.getItem("visites")||"[]")}catch(e){visits=[]}
    banner("Mode test : pour l’instant, les visites restent sur cet appareil. Colle la configuration Firebase pour les partager.");
    render();return;
  }
  try{
    const B="https://www.gstatic.com/firebasejs/10.12.2/";
    const [app,st,au]=await Promise.all([import(B+"firebase-app.js"),import(B+"firebase-firestore.js"),import(B+"firebase-auth.js")]);
    const a=app.initializeApp(FIREBASE_CONFIG);
    try{const cred=await au.signInAnonymously(au.getAuth(a));uid=cred.user.uid}
    catch(e){uid=null;banner("Connexion anonyme impossible : active-la dans Firebase (Authentication).")}
    fb={db:st.getFirestore(a,"default"),doc:st.doc,setDoc:st.setDoc,deleteDoc:st.deleteDoc};
    online=true;
    st.onSnapshot(st.collection(fb.db,"visits"),
      s=>{if(uid)banner("");visits=s.docs.map(d=>Object.assign({id:d.id},d.data()));render()},
      ()=>banner("Impossible de lire les visites. Vérifie les règles Firestore."));
  }catch(e){banner("Connexion impossible. Vérifie ta connexion internet.")}
}
init();
