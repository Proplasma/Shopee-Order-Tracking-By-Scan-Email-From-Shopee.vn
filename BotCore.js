/**
 * =========================================================================
 * MODULE QUẢN LÝ ĐƠN HÀNG SHOPEE QUA GMAIL & TELEGRAM (BẢN V7 - FINAL)
 * =========================================================================
 */

// -------------------------------------------------------------------------
// 1. KHỐI CẤU HÌNH HỆ THỐNG (CONFIGURATION)
// -------------------------------------------------------------------------
const CONFIG = {
  SHEET_NAME: "Shopee_Orders",        
  SENDER_EMAIL: "info@mail.shopee.vn",
  LABEL_NAME: "Shopee_Tracker",       
  SEARCH_QUERY: `from:info@mail.shopee.vn -label:Shopee_Tracker (subject:"Thanh toán thành công" OR subject:"giao hàng thành công")`,
  MARK_AS_READ: true,                 
  MAX_THREADS: 10,
  
  TELEGRAM_BOT_TOKEN: "ĐIỀN_TOKEN_BOT_CỦA_BẠN_VÀO_ĐÂY", 
  TELEGRAM_CHAT_ID: "ĐIỀN_CHAT_ID_CỦA_BẠN_VÀO_ĐÂY"      
};

// -------------------------------------------------------------------------
// 2. MODULE TRÍCH XUẤT DỮ LIỆU
// -------------------------------------------------------------------------
class QuotedPrintableDecoder {
  static decode(str) {
    if (!str) return '';
    let cleanStr = str.replace(/=\r?\n/g, '');
    return cleanStr.replace(/=([0-9A-F]{2})/gi, function(match, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    });
  }

  static toCleanText(str) {
    if (!str) return '';
    try {
      return decodeURIComponent(escape(this.decode(str)))
                .replace(/<style([\s\S]*?)<\/style>/gi, '') 
                .replace(/<[^>]+>/g, ' ')                   
                .replace(/&nbsp;/g, ' ')                    
                .replace(/\s+/g, ' ')                       
                .trim();
    } catch (e) {
      return this.decode(str).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }
}

class ShopeeOrderData {
  constructor() {
    this.accountName = 'N/A';
    this.orderId = 'N/A';
    this.notiType = 'N/A';
    this.orderDate = 'N/A';
    this.actionTime = 'N/A'; 
    this.productName = 'N/A';
    this.productQty = '0';
    this.productPrice = '0';
    this.productImg = 'N/A';
    this.totalGoodsPrice = '0';
    this.shopeeVoucher = '0';
    this.shopeeDiscountCode = 'N/A';
    this.shippingFee = '0';
    this.totalPayment = '0';
    this.receiverName = 'N/A';
    this.receiverPhone = 'N/A';
    this.receiverAddress = 'N/A';
    this.paymentMethod = 'N/A';
    this.paymentDate = 'N/A';
    this.paymentAmount = '0';
  }

  toArray(stt) {
    let cleanUrl = this.productImg !== 'N/A' ? this.productImg.replace(/["'\s>]/g, '').trim() : '';
    let imageFormula = (cleanUrl && cleanUrl.startsWith('http')) ? `=IMAGE("${cleanUrl}")` : 'N/A';
    
    return [
      stt, this.accountName, this.orderId, this.notiType, this.orderDate,
      this.productName, this.productQty, this.productPrice, imageFormula,
      this.totalGoodsPrice, this.shopeeVoucher, this.shopeeDiscountCode,
      this.shippingFee, this.totalPayment, this.receiverName, this.receiverPhone,
      this.receiverAddress, this.paymentMethod, this.paymentDate, this.paymentAmount
    ];
  }
}

class ShopeeEmailParser {
  constructor(rawHtmlContent) {
    this.rawHtml = rawHtmlContent;
    this.cleanText = QuotedPrintableDecoder.toCleanText(rawHtmlContent);
  }

  parse() {
    let order = new ShopeeOrderData();
    let txt = this.cleanText;

    if (/giao thành công|đã được giao|đã nhận hàng/i.test(txt)) order.notiType = "Giao hàng thành công";
    else if (/thanh toán thành công/i.test(txt)) order.notiType = "Thanh toán thành công";

    let accMatch = txt.match(/Xin chào\s+([^, ]+)/i);
    if (accMatch) order.accountName = accMatch[1].trim();

    let orderIdMatch = txt.match(/#([A-Z0-9]{10,20})/);
    if (orderIdMatch) order.orderId = "#" + orderIdMatch[1].trim();

    let decodedHtml = QuotedPrintableDecoder.decode(this.rawHtml);
    let allImages = decodedHtml.match(/https?:\/\/[a-zA-Z0-9.-]+\/file\/[a-zA-Z0-9\-]+/gi);
    if (allImages) {
      let productImages = allImages.filter(url => 
        !url.includes('0cd023d64f04') && !url.includes('cacc3e27277d') && 
        !url.includes('5b4dcec6c9c6') && !url.includes('3814109aa6a3') && 
        !url.includes('3b08ded58cbb') && !url.includes('e7ab71dae122')    
      );
      if (productImages.length > 0) order.productImg = productImages[0];
    }

    let prodBlockMatch = txt.match(/Người bán:\s*[^\s]+\s+([\s\S]+?)(?=\s*(?:Mẫu mã|Số lượng|Giá):)/i);
    if (prodBlockMatch) {
      let rawProdName = prodBlockMatch[1].replace(/^\s*\d+\.\s*/, '');
      order.productName = rawProdName.trim();
    }

    order.orderDate = this.extractText(txt, /Ngày đặt hàng:\s*(.+?)(?=\s*Người bán:)/i);
    order.shopeeDiscountCode = this.extractText(txt, /Mã giảm giá của Shopee:\s*([A-Z0-9]+)/i);
    
    order.productQty = this.extractNumber(txt, /Số lượng:\s*(\d+)/i);
    order.productPrice = this.extractNumber(txt, /Giá:\s*(?:₫|đ)?\s*([\d,.]+)/i);
    order.totalGoodsPrice = this.extractNumber(txt, /Tổng tiền:\s*(?:₫|đ)?\s*([\d,.]+)/i);
    order.shopeeVoucher = this.extractNumber(txt, /Voucher từ Shopee:\s*(?:₫|đ)?\s*([\d,.]+)/i);
    order.shippingFee = this.extractNumber(txt, /Phí vận chuyển:\s*(?:₫|đ)?\s*([\d,.]+)/i);
    order.totalPayment = this.extractNumber(txt, /Tổng thanh toán:\s*(?:₫|đ)?\s*([\d,.]+)/i);
    order.paymentAmount = this.extractNumber(txt, /Số tiền thanh toán:\s*(?:₫|đ)?\s*([\d,.]+)/i);

    order.receiverName = this.extractText(txt, /Tên người nhận:\s*([^#]+?)(?=\s*(?:Số điện thoại:|Địa chỉ|$))/i);
    order.receiverPhone = this.extractText(txt, /Số điện thoại:\s*(\d+)/i);
    let addrMatch = txt.match(/Địa chỉ nhận hàng:\s*([\s\S]+?)(?=\s*(?:THÔNG TIN THANH TOÁN|Phương thức|$))/i);
    if (addrMatch) order.receiverAddress = addrMatch[1].trim();
    
    order.paymentMethod = this.extractText(txt, /Phương thức thanh toán:\s*([^#]+?)(?=\s*(?:Ngày thanh toán:|Số tiền|$))/i);
    order.paymentDate = this.extractText(txt, /Ngày thanh toán:\s*(.+?)(?=\s*Số tiền thanh toán:)/i);

    if (order.notiType === "Giao hàng thành công") {
      let deliveryMatch = txt.match(/giao th[aà]nh c[oô]ng ng[aà]y\s*([\d\/]+)/i);
      order.actionTime = deliveryMatch ? deliveryMatch[1].trim() : order.orderDate;
    } else {
      order.actionTime = order.paymentDate !== 'N/A' ? order.paymentDate : order.orderDate;
    }

    return order;
  }

  extractText(text, regex) {
    let match = text.match(regex);
    return (match && match[1]) ? match[1].trim() : 'N/A';
  }

  extractNumber(text, regex) {
    let match = text.match(regex);
    if (match && match[1]) {
      return match[1].replace(/[,.]/g, '').trim(); 
    }
    return '0';
  }
}

// -------------------------------------------------------------------------
// 3. MODULE QUẢN LÝ GOOGLE SHEETS
// -------------------------------------------------------------------------
class ShopeeSpreadsheetStorage {
  constructor() {
    this.ss = SpreadsheetApp.getActiveSpreadsheet();
    this.sheet = this.ss.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!this.sheet) {
      this.sheet = this.ss.insertSheet(CONFIG.SHEET_NAME);
    }
    this.initHeadersIfNeeded();
  }

  initHeadersIfNeeded() {
    if (this.sheet.getLastRow() === 0) {
      const headers = [
        "STT", "Tài khoản", "Mã đơn", "Loại TB", "Thời gian",
        "Tên Sản Phẩm", "SL", "Giá lẻ", "Hình Ảnh", "Tiền hàng",
        "Voucher", "Mã giảm", "Phí VC", "Tổng TT",
        "Người nhận", "SĐT", "Địa chỉ", "PTTT", "Ngày TT", "Tiền TT"
      ];
      this.sheet.appendRow(headers);
      
      let headerRange = this.sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight("bold").setBackground("#d9ead3"); 
      this.sheet.setFrozenRows(1);
      
      this.sheet.setColumnWidth(9, 80); 
      this.sheet.setColumnWidth(6, 250); 
    }
  }

  findOrderRow(orderId) {
    if (orderId === 'N/A' || !orderId) return -1;
    let data = this.sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === orderId) {
        return i + 1; 
      }
    }
    return -1;
  }

  saveOrUpdateOrder(orderData) {
    let existingRow = this.findOrderRow(orderData.orderId);
    
    if (existingRow > -1) {
      let currentNoti = this.sheet.getRange(existingRow, 4).getValue(); 
      let currentTimeCell = this.sheet.getRange(existingRow, 5).getValue(); 
      
      if (!String(currentNoti).includes(orderData.notiType)) {
         let newNoti = currentNoti + "\n" + orderData.notiType;
         let newTime = currentTimeCell + "\n" + orderData.actionTime; 
         
         this.sheet.getRange(existingRow, 4).setValue(newNoti);
         this.sheet.getRange(existingRow, 5).setValue(newTime); 
         
         this.sheet.getRange(existingRow, 4, 1, 2).setWrap(true).setVerticalAlignment("middle");
         Logger.log(`[*] Đã CẬP NHẬT thêm trạng thái cho đơn: ${orderData.orderId}`);
      } else {
         Logger.log(`[-] Bỏ qua: Đơn ${orderData.orderId} đã có trạng thái ${orderData.notiType}`);
      }
    } else {
      let nextStt = this.sheet.getLastRow();
      let rowData = orderData.toArray(nextStt);
      this.sheet.appendRow(rowData);
      
      this.sheet.getRange(nextStt + 1, 1, 1, rowData.length).setVerticalAlignment("middle");
      this.sheet.getRange(nextStt + 1, 4, 1, 2).setWrap(true);
      Logger.log(`[+] Đã GHI MỚI đơn hàng: ${orderData.orderId}`);
    }
  }
}

// -------------------------------------------------------------------------
// 4. MODULE THÔNG BÁO TELEGRAM
// -------------------------------------------------------------------------
class TelegramNotifier {
  static sendMessage(orderData) {
    if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID || CONFIG.TELEGRAM_BOT_TOKEN.includes("ĐIỀN_TOKEN")) {
      return;
    }

    let url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    let text = `🛒 <b>THÔNG BÁO SHOPEE: ${orderData.notiType.toUpperCase()}</b>\n\n`;
    text += `👤 <b>Tài khoản:</b> ${orderData.accountName}\n`;
    text += `📦 <b>Mã đơn:</b> <code>${orderData.orderId}</code>\n`;
    text += `🛍️ <b>Sản phẩm:</b> ${orderData.productName}\n`;
    text += `💵 <b>Tổng thanh toán:</b> ${this.formatMoney(orderData.totalPayment)}\n`;
    if (orderData.receiverAddress !== 'N/A') {
      text += `📍 <b>Giao đến:</b> ${orderData.receiverAddress}\n\n`;
    } else {
      text += `\n`;
    }
    text += `<i>Hệ thống tự động theo dõi Shopee</i>`;

    let payload = {
      "chat_id": CONFIG.TELEGRAM_CHAT_ID,
      "text": text,
      "parse_mode": "HTML"
    };

    let options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };

    try {
      UrlFetchApp.fetch(url, options);
    } catch (e) {
      Logger.log(`[-] Lỗi API Telegram: ${e.message}`);
    }
  }

  static formatMoney(amountStr) {
    if (amountStr === "0" || amountStr === "N/A") return amountStr + " đ";
    let num = parseInt(amountStr, 10);
    return isNaN(num) ? amountStr : num.toLocaleString('vi-VN') + " đ";
  }
}

// -------------------------------------------------------------------------
// 5. HELPER: QUẢN LÝ NHÃN (LABEL) GMAIL
// -------------------------------------------------------------------------
function getOrCreateTrackerLabel() {
  let label = GmailApp.getUserLabelByName(CONFIG.LABEL_NAME);
  if (!label) {
    label = GmailApp.createLabel(CONFIG.LABEL_NAME);
  }
  return label;
}

// -------------------------------------------------------------------------
// 6. HÀM CHẠY TỰ ĐỘNG THEO THỜI GIAN (CRON JOB)
// -------------------------------------------------------------------------
function autoScanShopeeEmails() {
  Logger.log("🚀 Khởi chạy quá trình quét tự động...");
  
  let trackerLabel = getOrCreateTrackerLabel();
  let threads = GmailApp.search(CONFIG.SEARCH_QUERY);
  if (threads.length === 0) {
    Logger.log("📭 Không có email đơn hàng Shopee mới nào.");
    return;
  }

  let storage = new ShopeeSpreadsheetStorage();
  let processedCount = 0;

  for (let i = 0; i < threads.length; i++) {
    let thread = threads[i];
    let messages = thread.getMessages();
    let hasProcessedAnyInThread = false;
    
    for (let j = 0; j < messages.length; j++) {
      let message = messages[j];
      
      try {
        let parser = new ShopeeEmailParser(message.getBody());
        let orderData = parser.parse();
        
        storage.saveOrUpdateOrder(orderData);
        TelegramNotifier.sendMessage(orderData);
        
        hasProcessedAnyInThread = true;
        processedCount++;
      } catch (error) {
        Logger.log(`[X] Lỗi khi xử lý email ${message.getSubject()}: ${error.message}`);
      }
    }
    
    if (hasProcessedAnyInThread) {
      thread.addLabel(trackerLabel);
      Logger.log(`[+] Đã gắn nhãn ${CONFIG.LABEL_NAME} cho luồng thư.`);
    }
  }
  
  Logger.log(`✅ Đã xử lý xong và gắn nhãn cho ${processedCount} email mới.`);
}

function testSingleLatestEmail() {
  let trackerLabel = getOrCreateTrackerLabel();
  let threads = GmailApp.search(`from:${CONFIG.SENDER_EMAIL} -label:${CONFIG.LABEL_NAME} (subject:"Thanh toán thành công" OR subject:"giao hàng thành công")`, 0, 1);
  if (threads.length === 0) return Logger.log("❌ Không tìm thấy mail nào chưa dán nhãn.");
  let thread = threads[0];
  let message = thread.getMessages()[0];
  
  let orderData = new ShopeeEmailParser(message.getBody()).parse();
  let storage = new ShopeeSpreadsheetStorage();
  storage.saveOrUpdateOrder(orderData);
  TelegramNotifier.sendMessage(orderData);
  
  thread.addLabel(trackerLabel);
  Logger.log("✅ Chạy test thành công! Đã dán nhãn tránh quét lặp.");
}