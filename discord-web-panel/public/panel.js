async function fetchTickets(){
  const res = await fetch('/api/tickets');
  if (res.status === 401) {
    window.location.href = '/login';
    return;
  }
  const tickets = await res.json();
  const el = document.getElementById('tickets');
  el.innerHTML = '';
  tickets.forEach(t=>{
    const d = document.createElement('div');
    d.className = 'ticket';
    d.innerHTML = `<strong>${t.subject}</strong><div>ID: ${t.id}</div><div>Status: ${t.status}</div>`;
    const closeBtn = document.createElement('button'); closeBtn.textContent='Close';
    closeBtn.onclick = async ()=>{ await fetch('/api/tickets/'+t.id+'/close',{method:'POST'}); fetchTickets(); };
    const reopenBtn = document.createElement('button'); reopenBtn.textContent='Reopen';
    reopenBtn.onclick = async ()=>{ await fetch('/api/tickets/'+t.id+'/reopen',{method:'POST'}); fetchTickets(); };
    const delBtn = document.createElement('button'); delBtn.textContent='Delete';
    delBtn.onclick = async ()=>{ if(confirm('Delete?')){ await fetch('/api/tickets/'+t.id+'/delete',{method:'POST'}); fetchTickets(); } };
    d.appendChild(closeBtn); d.appendChild(reopenBtn); d.appendChild(delBtn);
    el.appendChild(d);
  });
}

async function fetchWarnings(){
  const res = await fetch('/api/warnings');
  if (res.status === 401) { window.location.href = '/login'; return; }
  const data = await res.json();
  const el = document.getElementById('warnings');
  el.innerHTML = '<pre>'+JSON.stringify(data, null, 2)+'</pre>';
}

async function fetchBans(){
  const res = await fetch('/api/bans');
  if (res.status === 401) { window.location.href = '/login'; return; }
  const data = await res.json();
  const el = document.getElementById('bans');
  el.innerHTML = '<pre>'+JSON.stringify(data, null, 2)+'</pre>';
}

document.addEventListener('DOMContentLoaded', ()=>{ fetchTickets(); fetchWarnings(); fetchBans(); document.getElementById('logout').onclick = ()=>{ location.href='/logout'; }; });
