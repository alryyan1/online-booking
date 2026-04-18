const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

// تهيئة Firebase Admin
admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// --- الوظائف المساعدة ---
const listAllUsers = async (nextPageToken, acc = []) => {
    const result = await admin.auth().listUsers(1000, nextPageToken);
    const users = [...acc, ...result.users.map((u) => ({
        uid: u.uid, email: u.email || null, displayName: u.displayName || null,
        phoneNumber: u.phoneNumber || null, photoURL: u.photoURL || null,
        emailVerified: u.emailVerified, disabled: u.disabled,
        customClaims: u.customClaims || {}, createdAt: u.metadata.creationTime,
        lastSignIn: u.metadata.lastSignInTime || null,
        providers: u.providerData.map((p) => p.providerId),
    }))];
    return result.pageToken ? listAllUsers(result.pageToken, users) : users;
};

const normalizePhone = (p) => {
    const d = p.replace(/\D/g, '');
    if (d.startsWith('249')) return d;
    if (d.startsWith('0')) return '249' + d.slice(1);
    return '249' + d;
};

// --- الـ Endpoints ---

// Auth Users
app.get('/auth-users', async (_req, res) => {
    try { res.json({ users: await listAllUsers() }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/auth-users/:uid', async (req, res) => {
    try {
        const { role, disabled } = req.body;
        if (disabled !== undefined) await admin.auth().updateUser(req.params.uid, { disabled });
        if (role !== undefined) await admin.auth().setCustomUserClaims(req.params.uid, { role });
        res.json(await admin.auth().getUser(req.params.uid));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/auth-users', async (req, res) => {
    try {
        const user = await admin.auth().createUser({ email: req.body.email, password: req.body.password, displayName: req.body.displayName });
        if (req.body.role) await admin.auth().setCustomUserClaims(user.uid, { role: req.body.role });
        res.status(201).json({ uid: user.uid });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/auth-users/:uid', async (req, res) => {
    try { await admin.auth().deleteUser(req.params.uid); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// SMS Proxy
app.post('/sms', async (req, res) => {
    const { phone, message } = req.body;
    console.log(`Sending SMS to: ${phone}, Message: ${message}`);
    const apiKey = process.env.AIRTEL_SMS_API_KEY;
    try {
        const response = await fetch('https://www.airtel.sd/api/rest_send_sms/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
            body: JSON.stringify({ sender: process.env.AIRTEL_SMS_SENDER || 'Booking', messages: [{ to: normalizePhone(phone), message, MSGID: String(Date.now()) }] }),
        });
        const data = await response.json();
        console.log('Airtel SMS API Response:', data);
        res.json({ ok: true, ...data });
    } catch (err) {
        console.error('SMS Proxy Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// WhatsApp Proxy
app.post('/whatsapp', async (req, res) => {
    const { phone, template, parameters } = req.body;
    console.log(`Sending WhatsApp to: ${phone}, Template: ${template}, Params:`, parameters);
    try {
        const waRes = await fetch(`https://graph.facebook.com/v25.0/${process.env.WA_PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}` },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: normalizePhone(phone),
                type: 'template',
                template: {
                    name: template,
                    language: { code: 'ar' },
                    components: [{
                        type: 'body',
                        parameters: parameters.map(val => ({ type: 'text', text: val }))
                    }]
                }
            })
        });
        const data = await waRes.json();
        console.log('WhatsApp Meta API Response:', data);
        res.json({ ok: true, ...data });
    } catch (err) {
        console.error('WhatsApp Proxy Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// تصدير الـ API
exports.api = onRequest({ secrets: ['AIRTEL_SMS_API_KEY', 'WA_ACCESS_TOKEN', 'WA_PHONE_NUMBER_ID', 'WA_TEMPLATE_NAME', 'AIRTEL_SMS_SENDER'] }, app);