const API_URL = 'https://mysterious-agnes-apiiiiiiiii-d84d7cb6.koyeb.app/api';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    wakeUpServer();
    loadProducts();
    loadCategories();
});

async function wakeUpServer() {
    try {
        console.log('📡 Pinging server to wake it up...');
        await fetch(`${API_URL}/products?limit=1`);
        console.log('✅ Server is awake!');
    } catch (err) {
        console.log('⚠️ Server wake-up ping failed (might be offline or waking up).');
    }
}

// --- Navigation ---
function showSection(sectionId, element) {
    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
    document.getElementById(`${sectionId}-section`).style.display = 'block';

    if (element) {
        document.querySelectorAll('.sidebar a').forEach(link => link.classList.remove('active'));
        element.classList.add('active');
    }

    if (sectionId === 'shipping') loadWilayas();
    if (sectionId === 'orders') loadOrders();
    if (sectionId === 'products') loadProducts();
}

// --- Shipping Logic (The Core Request) ---
let selectedWilayaId = null;
let selectedBaladiyaId = null;

async function loadWilayas() {
    try {
        const res = await fetch(`${API_URL}/shipping/wilayas`);
        const wilayas = await res.json();
        const list = document.getElementById('wilayas-list');
        list.innerHTML = '';

        wilayas.forEach(w => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            if (selectedWilayaId === w.id) li.classList.add('active');

            // Make entire row clickable
            li.onclick = () => selectWilaya(w.id, li);

            li.innerHTML = `
                <span>${w.name}</span>
                <button class="btn-delete-sm" onclick="deleteWilaya(${w.id}, event)">×</button>
            `;
            list.appendChild(li);
        });
    } catch (err) { console.error(err); }
}

function selectWilaya(id, liElement) {
    selectedWilayaId = id;
    selectedBaladiyaId = null; // Reset Baladiya selection

    // Highlight UI
    document.querySelectorAll('#wilayas-list .list-group-item').forEach(el => el.classList.remove('active'));
    liElement.classList.add('active');

    // Unlock Baladiya Panel
    const baladiyaPanel = document.getElementById('baladiya-panel');
    baladiyaPanel.style.opacity = '1';
    baladiyaPanel.style.pointerEvents = 'auto';
    document.getElementById('wilaya-hint').style.display = 'none';

    // Reset Rates Panel
    const ratesPanel = document.getElementById('rates-panel');
    ratesPanel.style.opacity = '0.5';
    ratesPanel.style.pointerEvents = 'none';
    document.getElementById('baladiya-hint').style.display = 'block';
    document.getElementById('rates-content').style.display = 'none';

    loadBaladiyas(id);
}

async function loadBaladiyas(wilayaId) {
    try {
        const res = await fetch(`${API_URL}/shipping/baladiyas/${wilayaId}`);
        const baladiyas = await res.json();
        const list = document.getElementById('baladiyas-list');
        list.innerHTML = '';

        baladiyas.forEach(b => {
            const li = document.createElement('li');
            li.className = 'list-group-item';

            // Make entire row clickable
            li.onclick = () => selectBaladiya(b.id, li);

            li.innerHTML = `
                <span>${b.name}</span>
                <button class="btn-delete-sm" onclick="deleteBaladiya(${b.id}, event)">×</button>
            `;
            list.appendChild(li);
        });
    } catch (err) { console.error(err); }
}

function selectBaladiya(id, liElement) {
    selectedBaladiyaId = id;

    // Highlight UI
    document.querySelectorAll('#baladiyas-list .list-group-item').forEach(el => el.classList.remove('active'));
    liElement.classList.add('active');

    // Unlock Rates Panel
    const ratesPanel = document.getElementById('rates-panel');
    ratesPanel.style.opacity = '1';
    ratesPanel.style.pointerEvents = 'auto';
    document.getElementById('baladiya-hint').style.display = 'none';
    document.getElementById('rates-content').style.display = 'block';

    loadShippingRate(id);
}

async function loadShippingRate(baladiyaId) {
    try {
        const res = await fetch(`${API_URL}/shipping/rate/${baladiyaId}`);
        if (res.ok) {
            const rate = await res.json();
            document.getElementById('shipping-price-home').value = rate.homePrice;
            document.getElementById('shipping-price-desk').value = rate.deskPrice;
        } else {
            document.getElementById('shipping-price-home').value = '';
            document.getElementById('shipping-price-desk').value = '';
        }
    } catch (err) { console.error(err); }
}

async function saveShippingRate() {
    const homePrice = document.getElementById('shipping-price-home').value;
    const deskPrice = document.getElementById('shipping-price-desk').value;
    const msgDiv = document.getElementById('shipping-status-msg');

    if (!selectedBaladiyaId) return;

    // Reset Message
    msgDiv.style.display = 'none';
    msgDiv.className = 'status-message';

    const payload = {
        BaladiyaId: selectedBaladiyaId,
        HomePrice: parseFloat(homePrice || 0),
        DeskPrice: parseFloat(deskPrice || 0)
    };

    console.log('📤 Sending shipping rate:', payload);

    try {
        const res = await fetch(`${API_URL}/shipping/rates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('📥 Response status:', res.status);

        if (res.ok) {
            msgDiv.innerText = 'تم حفظ الأسعار بنجاح! ✅';
            msgDiv.className = 'status-message status-success';
            msgDiv.style.display = 'block';

            // Hide after 3 seconds
            setTimeout(() => {
                msgDiv.style.display = 'none';
            }, 3000);
        } else {
            const errorText = await res.text();
            console.error('❌ API Error:', errorText);
            throw new Error(errorText || 'فشل الحفظ');
        }
    } catch (err) {
        console.error('❌ Full error:', err);
        msgDiv.innerText = `حدث خطأ: ${err.message || 'مشكلة في الاتصال'} ❌`;
        msgDiv.className = 'status-message status-error';
        msgDiv.style.display = 'block';
    }
}

// --- Add/Delete Logic ---

async function addWilayaFromModal() {
    const name = document.getElementById('modal-new-wilaya').value;
    if (!name) return;
    await fetch(`${API_URL}/shipping/wilayas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    closeModal('wilaya-modal');
    document.getElementById('modal-new-wilaya').value = '';
    loadWilayas();
}

async function addBaladiyaFromModal() {
    const name = document.getElementById('modal-new-baladiya').value;
    if (!name || !selectedWilayaId) return;
    await fetch(`${API_URL}/shipping/baladiyas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, wilayaId: selectedWilayaId })
    });
    closeModal('baladiya-modal');
    document.getElementById('modal-new-baladiya').value = '';
    loadBaladiyas(selectedWilayaId);
}

async function seedWilayas() {
    if (!confirm('هل أنت متأكد من إضافة 58 ولاية؟')) return;
    const wilayas = [
        "أدرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية", "بسكرة", "بشار", "البليدة", "البويرة",
        "تمنراست", "تبسة", "تلمسان", "تيارت", "تيزي وزو", "الجزائر", "الجلفة", "جيجل", "سطيف", "سعيدة",
        "سكيكدة", "سيدي بلعباس", "عنابة", "قالمة", "قسنطينة", "المدية", "مستغانم", "المسيلة", "معسكر", "ورقلة",
        "وهران", "البيض", "إليزي", "برج بوعريريج", "بومرداس", "الطارف", "تندوف", "تيسمسيلت", "الوادي", "خنشلة",
        "سوق أهراس", "تيبازة", "ميلة", "عين الدفلى", "النعامة", "عين تموشنت", "غرداية", "غليزان",
        "تيميمون", "برج باجي مختار", "أولاد جلال", "بني عباس", "عين صالح", "عين قزام", "تقرت", "جانوت", "المغير", "المنيعة"
    ];
    for (const w of wilayas) {
        await fetch(`${API_URL}/shipping/wilayas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: w })
        });
    }
    loadWilayas();
}

async function deleteWilaya(id, e) {
    e.stopPropagation();
    if (confirm('حذف الولاية؟')) {
        await fetch(`${API_URL}/shipping/wilayas/${id}`, { method: 'DELETE' });
        loadWilayas();
    }
}

async function deleteBaladiya(id, e) {
    e.stopPropagation();
    if (confirm('حذف البلدية؟')) {
        await fetch(`${API_URL}/shipping/baladiyas/${id}`, { method: 'DELETE' });
        loadBaladiyas(selectedWilayaId);
    }
}

// --- Products & Orders (Simplified for brevity, assuming existing logic works) ---
let allProducts = [];

async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/products`);
        allProducts = await res.json();
        const tbody = document.querySelector('#products-table tbody');
        tbody.innerHTML = allProducts.map(p => `
            <tr>
                <td>${p.id}</td>
                <td><img src="${p.imageUrl || ''}" class="product-img"></td>
                <td>${p.name}</td>
                <td>${p.price}</td>
                <td>${p.category?.name || '-'}</td>
                <td>
                    <button class="btn-edit-sm" onclick="openEditProduct(${p.id})">✏️</button>
                    <button class="btn-delete-sm" onclick="deleteProduct(${p.id})">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (err) { console.error(err); }
}

async function loadCategories() {
    const categories = [
        { id: 1, name: 'اإستراتيجيات' }, { id: 2, name: 'الحقائب' }, { id: 3, name: 'الأدوات المدرسية' },
        { id: 4, name: 'وسائل المشاريع' }, { id: 5, name: 'الأدوات المكتبية' }, { id: 6, name: 'الدفاتر' }, { id: 7, name: 'وسائل أخرى' }
    ];
    const select = document.getElementById('p-category');
    select.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

let editingProductId = null;

function openAddProduct() {
    editingProductId = null;
    document.getElementById('add-product-form').reset();
    document.querySelector('#product-modal h2').innerText = 'إضافة منتج جديد';
    openModal('product-modal');
}

function openEditProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    editingProductId = id;
    document.getElementById('p-name').value = product.name;
    document.getElementById('p-desc').value = product.description;
    document.getElementById('p-price').value = product.price;
    document.getElementById('p-category').value = product.categoryId;
    document.getElementById('p-colors').value = product.availableColors || '';

    document.querySelector('#product-modal h2').innerText = 'تعديل المنتج';
    openModal('product-modal');
}

document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('btn-save-product');
    const msgDiv = document.getElementById('product-status-msg');

    // Reset UI
    btn.disabled = true;
    btn.innerText = 'جاري المعالجة...';
    msgDiv.style.display = 'none';
    msgDiv.className = 'status-message';

    // Cold Start Warning Timer (Render Free Tier)
    const slowTimer = setTimeout(() => {
        msgDiv.innerText = 'اصبر دقيقة...';
        msgDiv.className = 'status-message status-loading';
        msgDiv.style.display = 'block';
    }, 3000);

    const formData = new FormData();
    formData.append('Name', document.getElementById('p-name').value);
    formData.append('Description', document.getElementById('p-desc').value);
    formData.append('Price', document.getElementById('p-price').value);
    formData.append('CategoryId', document.getElementById('p-category').value);
    formData.append('AvailableColors', document.getElementById('p-colors').value);
    formData.append('StockQuantity', 0); // Default stock

    // Handle multiple image files
    const files = document.getElementById('p-image-file').files;
    if (files.length > 0) {
        // Upload multiple files - API will handle them
        for (let i = 0; i < files.length; i++) {
            formData.append('ImageFiles', files[i]);
        }
    }

    const url = editingProductId ? `${API_URL}/products/${editingProductId}` : `${API_URL}/products`;
    const method = editingProductId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, { method: method, body: formData });

        clearTimeout(slowTimer); // Clear warning if fast enough

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || 'فشل العملية');
        }

        // Success
        msgDiv.innerText = editingProductId ? 'تم التعديل بنجاح! ✅' : 'تمت إضافة المنتج بنجاح! ✅';
        msgDiv.className = 'status-message status-success';
        msgDiv.style.display = 'block';

        // Reset form after delay
        setTimeout(() => {
            closeModal('product-modal');
            loadProducts();
            btn.disabled = false;
            btn.innerText = 'حفظ';
            msgDiv.style.display = 'none';
        }, 1500);

    } catch (err) {
        clearTimeout(slowTimer);
        console.error(err);
        msgDiv.innerText = `حدث خطأ: ${err.message || 'مشكلة في الاتصال'}`;
        msgDiv.className = 'status-message status-error';
        msgDiv.style.display = 'block';
        btn.disabled = false;
        btn.innerText = 'حفظ';
    }
});

async function deleteProduct(id) {
    if (confirm('حذف؟')) {
        await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
        loadProducts();
    }
}

async function loadOrders() {
    const res = await fetch(`${API_URL}/orders`);
    const orders = await res.json();
    const container = document.getElementById('orders-container');
    if (orders.length === 0) { container.innerHTML = '<p>لا توجد طلبات</p>'; return; }

    container.innerHTML = `
        <table class="orders-table">
            <thead><tr><th>ID</th><th>العميل</th><th>الهاتف</th><th>النوع</th><th>المبلغ</th></tr></thead>
            <tbody>
                ${orders.map(o => `
                    <tr>
                        <td>#${o.id}</td>
                        <td>${o.customerName}</td>
                        <td>${o.customerPhone}</td>
                        <td>${o.deliveryType === 'Home' ? '🏠' : '🏢'}</td>
                        <td>${o.totalAmount} دج</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// --- Modal Helpers ---
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }


