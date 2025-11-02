const client = ZAFClient.init();
const statusEl = document.getElementById('status');
const orderCard = document.getElementById('order-card');
const noOrder = document.getElementById('no-order');
const orderIdEl = document.getElementById('order-id');
const orderDateEl = document.getElementById('order-date');
const orderStatusEl = document.getElementById('order-status');
const orderTotalEl = document.getElementById('order-total');
const orderItemsEl = document.getElementById('order-items');
const postCommentBtn = document.getElementById('post-comment');
const aiSection = document.getElementById('ai-section');
const processAiBtn = document.getElementById('process-ai');
const aiStatusEl = document.getElementById('ai-status');

/* Get middleware URL */
let MIDDLEWARE_ORIGIN = 'http://localhost:3000';

/* Get middleware URL from app settings if configured */
client.get('app.settings.middlewareUrl').then((response) => {
  if (response['app.settings.middlewareUrl']) {
    MIDDLEWARE_ORIGIN = response['app.settings.middlewareUrl'];
  }
});

function showStatus(text) {
  statusEl.textContent = text;
}

function showOrder(order) {
  orderCard.classList.remove('hidden');
  noOrder.classList.add('hidden');
  orderIdEl.textContent = order.id || '-';
  orderDateEl.textContent = order.date || '-';
  orderStatusEl.textContent = order.status || '-';
  orderTotalEl.textContent = order.total ? `${order.total}` : '-';
  orderItemsEl.innerHTML = '';
  (order.items || []).forEach(it => {
    const li = document.createElement('li');
    li.textContent = `${it.name} x${it.quantity}`;
    orderItemsEl.appendChild(li);
  });
}

function showNoOrder() {
  orderCard.classList.add('hidden');
  noOrder.classList.remove('hidden');
}

async function fetchOrderByEmail(email) {
  showStatus('Fetching order...');
  try {
    const res = await fetch(`${MIDDLEWARE_ORIGIN}/order?email=${encodeURIComponent(email)}`);
    const json = await res.json();
    return json;
  } catch (err) {
    console.error(err);
    showStatus('Error fetching order');
    return null;
  }
}

async function postInternalComment(ticketId, text) {
  showStatus('Posting comment...');
  try {
    const response = await client.request({
      url: `/api/v2/tickets/${ticketId}.json`,
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        ticket: {
          comment: {
            body: text,
            public: false
          }
        }
      })
    });
    showStatus('Comment posted successfully');
    return response;
  } catch (err) {
    console.error('Error posting comment:', err);
    showStatus('Failed to post comment');
    throw err;
  }
}

async function init() {
  showStatus('Initializing...');
  const context = await client.context();
  const ticketId = context.ticket ? context.ticket.id : null;

  let requesterEmail = null;
  if (context.requester && context.requester.email) requesterEmail = context.requester.email;
  else if (context.ticket && context.ticket.requester && context.ticket.requester.email) requesterEmail = context.ticket.requester.email;

  if (!requesterEmail) {
    showStatus('Cannot determine requester email');
    showNoOrder();
    return;
  }

  showStatus('Requester: ' + requesterEmail);

  const data = await fetchOrderByEmail(requesterEmail.toLowerCase());
  if (!data) {
    showNoOrder();
    return;
  }

  if (data.error) {
    showStatus(data.error);
    showNoOrder();
    return;
  }
  const order = data.order || data;
  if (!order || (Array.isArray(order) && order.length === 0)) {
    showNoOrder();
    return;
  }

  showOrder(order);
  showStatus('Order loaded');
  
  if (ticketId) {
    aiSection.classList.remove('hidden');
  }

  postCommentBtn.onclick = async () => {
    postCommentBtn.disabled = true;
    const summaryText = `Order ${order.id} — Date: ${order.date}, Status: ${order.status}, Total: ${order.total}. Items: ${(order.items||[]).map(i=>i.name+' x'+i.quantity).join(', ')}`;
    try {
      await postInternalComment(ticketId, summaryText);
    } catch (e) {
    } finally {
      postCommentBtn.disabled = false;
    }
  };

  processAiBtn.onclick = async () => {
    if (!ticketId) {
      aiStatusEl.textContent = 'No ticket available';
      return;
    }
    
    processAiBtn.disabled = true;
    aiStatusEl.textContent = 'Processing ticket comments...';
    
    try {

      const ticketResponse = await client.request({
        url: `/api/v2/tickets/${ticketId}.json?include=comments`,
        type: 'GET'
      });
      
      const ticket = ticketResponse.ticket;
      const commentsResponse = await client.request({
        url: `/api/v2/tickets/${ticketId}/comments.json`,
        type: 'GET'
      });
      
      const comments = commentsResponse.comments || [];
      const allText = [
        `Subject: ${ticket.subject || ''}`,
        `Description: ${ticket.description || ''}`,
        ...comments.map(c => `Comment: ${c.body || ''}`)
      ].join('\n\n');
      
      aiStatusEl.textContent = 'Sending to AI...';
      
      const aiResponse = await fetch(`${MIDDLEWARE_ORIGIN}/ai-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: allText })
      });
      
      const aiData = await aiResponse.json();
      const summary = aiData.summary || 'No summary generated';
      
      aiStatusEl.textContent = 'Posting AI summary...';
      
      await postInternalComment(ticketId, `AI Summary:\n${summary}`);
      
      aiStatusEl.textContent = 'AI summary posted successfully!';
      setTimeout(() => {
        aiStatusEl.textContent = '';
      }, 3000);
      
    } catch (err) {
      console.error('AI processing error:', err);
      aiStatusEl.textContent = 'Error processing with AI';
    } finally {
      processAiBtn.disabled = false;
    }
  };
}

client.on('app.registered', init);
