// Lightweight i18n — no full app-wide translation (that's a much bigger
// lift than one feature slot justifies). Covers the screens staff live in
// day to day: the sidebar, POS, Orders and Billing. Everything else stays
// English until/unless this gets extended.

import { useEffect, useState } from "react";

export type Lang = "en" | "hi";

const LANG_KEY = "order-dashboard-lang";
const listeners = new Set<() => void>();

export function getLanguage(): Lang {
  return (localStorage.getItem(LANG_KEY) as Lang) || "en";
}

export function setLanguage(lang: Lang) {
  localStorage.setItem(LANG_KEY, lang);
  listeners.forEach((fn) => fn());
}

const translations: Record<Lang, Record<string, string>> = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.pos": "POS / New Order",
    "nav.orders": "Orders",
    "nav.tables": "Tables",
    "nav.reservations": "Reservations",
    "nav.kitchen": "Kitchen",
    "nav.menu": "Menu",
    "nav.billing": "Billing",
    "nav.inventory": "Inventory",
    "nav.recipes": "Recipes",
    "nav.customers": "Customers",
    "nav.staff": "Staff & Roles",
    "nav.attendance": "Attendance",
    "nav.payroll": "Payroll",
    "nav.expenses": "Expenses",
    "nav.reports": "Reports",
    "nav.settings": "Settings",
    "nav.logout": "Logout",

    "pos.dineIn": "Dine-In",
    "pos.takeaway": "Takeaway",
    "pos.delivery": "Delivery",
    "pos.searchItems": "Search items…",
    "pos.cart": "Cart",
    "pos.noItemsYet": "No items yet. Tap a menu item to add it.",
    "pos.orderNotes": "Order notes…",
    "pos.discount": "Discount",
    "pos.subtotal": "Subtotal",
    "pos.tax": "Tax",
    "pos.total": "Total",
    "pos.saveOrder": "Save Order",
    "pos.hold": "Hold",
    "pos.sendToKitchen": "Send to Kitchen",
    "pos.printKot": "Print KOT",
    "pos.printBill": "Print Bill",
    "pos.cancel": "Cancel",
    "pos.completePayment": "Complete Payment",

    "orders.title": "Orders",
    "orders.orderNumber": "Order #",
    "orders.type": "Type",
    "orders.table": "Table",
    "orders.customer": "Customer",
    "orders.waiter": "Waiter",
    "orders.items": "Items",
    "orders.amount": "Amount",
    "orders.payment": "Payment",
    "orders.status": "Status",
    "orders.time": "Time",
    "orders.actions": "Actions",

    "billing.title": "Billing & Payments",
    "billing.pendingBills": "Bills pending payment.",
    "billing.recentInvoices": "Recent Invoices",
    "billing.paymentMethod": "Payment Method",
    "billing.tip": "Tip",
    "billing.splitBetween": "Split between",
    "billing.completePayment": "Complete Payment & Generate Invoice",
  },
  hi: {
    "nav.dashboard": "डैशबोर्ड",
    "nav.pos": "POS / नया ऑर्डर",
    "nav.orders": "ऑर्डर",
    "nav.tables": "टेबल",
    "nav.reservations": "बुकिंग",
    "nav.kitchen": "किचन",
    "nav.menu": "मेनू",
    "nav.billing": "बिलिंग",
    "nav.inventory": "इन्वेंटरी",
    "nav.recipes": "रेसिपी",
    "nav.customers": "ग्राहक",
    "nav.staff": "स्टाफ और भूमिकाएँ",
    "nav.attendance": "उपस्थिति",
    "nav.payroll": "वेतन",
    "nav.expenses": "खर्च",
    "nav.reports": "रिपोर्ट",
    "nav.settings": "सेटिंग्स",
    "nav.logout": "लॉगआउट",

    "pos.dineIn": "डाइन-इन",
    "pos.takeaway": "टेकअवे",
    "pos.delivery": "डिलीवरी",
    "pos.searchItems": "आइटम खोजें…",
    "pos.cart": "कार्ट",
    "pos.noItemsYet": "अभी कोई आइटम नहीं। जोड़ने के लिए मेनू आइटम पर टैप करें।",
    "pos.orderNotes": "ऑर्डर नोट्स…",
    "pos.discount": "छूट",
    "pos.subtotal": "सबटोटल",
    "pos.tax": "टैक्स",
    "pos.total": "कुल",
    "pos.saveOrder": "ऑर्डर सेव करें",
    "pos.hold": "होल्ड",
    "pos.sendToKitchen": "किचन भेजें",
    "pos.printKot": "KOT प्रिंट करें",
    "pos.printBill": "बिल प्रिंट करें",
    "pos.cancel": "रद्द करें",
    "pos.completePayment": "भुगतान पूरा करें",

    "orders.title": "ऑर्डर",
    "orders.orderNumber": "ऑर्डर #",
    "orders.type": "प्रकार",
    "orders.table": "टेबल",
    "orders.customer": "ग्राहक",
    "orders.waiter": "वेटर",
    "orders.items": "आइटम",
    "orders.amount": "राशि",
    "orders.payment": "भुगतान",
    "orders.status": "स्थिति",
    "orders.time": "समय",
    "orders.actions": "कार्रवाई",

    "billing.title": "बिलिंग और भुगतान",
    "billing.pendingBills": "भुगतान बाकी बिल।",
    "billing.recentInvoices": "हाल के इनवॉइस",
    "billing.paymentMethod": "भुगतान का तरीका",
    "billing.tip": "टिप",
    "billing.splitBetween": "बीच में बाँटें",
    "billing.completePayment": "भुगतान पूरा करें और इनवॉइस बनाएं",
  },
};

export function t(key: string, lang: Lang = getLanguage()): string {
  return translations[lang][key] ?? translations.en[key] ?? key;
}

// Re-renders the component whenever the language changes (setLanguage
// call anywhere, including from a different component like the sidebar
// toggle) — same "no context provider needed" pattern as the outlet
// switcher, since this is a plain localStorage preference.
export function useTranslation() {
  const [lang, setLang] = useState<Lang>(getLanguage());

  useEffect(() => {
    const listener = () => setLang(getLanguage());
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { t: (key: string) => t(key, lang), lang, setLanguage };
}
