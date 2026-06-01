// ============================================
// 📱 MESSAGE CENTRAL OTP SERVICE
// ============================================
// Ye service SMS OTP bhejti hai aur verify karti hai
// MessageCentral API use karti hai

const axios = require("axios");
const logger = require("../utils/logger");
require("dotenv").config();

class MessageCentralOTP {
  constructor() {
    // Environment variables se configuration load karo
    this.sendOtpUrl = process.env.MESSAGE_CENTRAL_SEND_OTP_URL;
    this.validateOtpUrl = process.env.MESSAGE_CENTRAL_VALIDATE_OTP_URL;
    this.countryCode = process.env.MESSAGE_CENTRAL_COUNTRY_CODE || "91"; // Default India
    this.customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID || "C-121EB742317B4AB";
    this.authToken = process.env.MESSAGE_CENTRAL_AUTH_TOKEN;

    // Country code override (agar environment variable set hai)
    if (process.env.MESSAGE_CENTRAL_COUNTRY_CODE) {
      this.countryCode = process.env.MESSAGE_CENTRAL_COUNTRY_CODE;
    }
  }

  // 📤 OTP bhejta hai customer ke mobile number pe
  async sendOTP(mobileNumber) {
    try {
      // Mobile number clean karo (sirf digits rakho)
      const cleanedMobile = String(mobileNumber).replace(/\D/g, "");

      // 🔓 Development bypass - Testing ke liye (ONLY in non-production)
      if (process.env.NODE_ENV !== 'production' && cleanedMobile === "9356918260") {
        logger.info("ℹ️  Message Central: Local development bypass triggered for", cleanedMobile);
        return {
          success: true,
          verificationId: `mock_verification_id_${cleanedMobile}_${Date.now()}`,
        };
      }

      // Configuration check karo
      if (!this.sendOtpUrl || !this.authToken) {
        logger.error("❌ Message Central not configured properly");
        throw new Error("SMS service not configured");
      }

      // MessageCentral API call karo
      const response = await axios.post(
        `${this.sendOtpUrl}?countryCode=${this.countryCode}&customerId=${this.customerId}&flowType=SMS&mobileNumber=${cleanedMobile}&otpLength=6`,
        {},
        {
          headers: {
            authToken: this.authToken,
            "Content-Type": "application/json",
          },
          timeout: 15000, // 15 seconds timeout
        },
      );

      // Response se verification ID nikalo
      if (response.data) {
        const verificationId =
          response.data.verificationId ||
          response.data.data?.verificationId ||
          response.data.requestId ||
          response.data.data?.requestId;

        if (verificationId) {
          return {
            success: true,
            verificationId: verificationId,
          };
        } else {
          // Fallback verification ID generate karo
          return {
            success: true,
            verificationId: `fallback_${cleanedMobile}_${Date.now()}`,
          };
        }
      } else {
        throw new Error("Empty response from Message Central");
      }
    } catch (error) {
      logger.error("❌ Message Central Send OTP Error:", error.response?.data || error.message);

      const errData = error.response?.data;
      if (errData) {
        const resCode = errData.responseCode || errData.data?.responseCode;
        const errMsg = errData.message || errData.data?.errorMessage;
        const activeId = errData.verificationId || errData.data?.verificationId;

        if ((resCode === 506 || resCode === "506" || errMsg === "REQUEST_ALREADY_EXISTS") && activeId) {
          logger.info("⚠️ Message Central: Request already exists, reusing active verificationId:", activeId);
          return {
            success: true,
            verificationId: activeId
          };
        }
      }

      // Error type ke basis pe appropriate message bhejo
      if (error.response?.status === 401) {
        throw new Error("Authentication failed with Message Central");
      } else if (error.response?.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later");
      } else if (error.code === "ECONNABORTED") {
        throw new Error("Request timeout. Please try again");
      } else {
        throw new Error("Failed to send OTP via Message Central");
      }
    }
  }

  // ✅ OTP verify karta hai
  async verifyOTP(mobileNumber, otp, verificationId) {
    try {
      const cleanedMobile = String(mobileNumber).replace(/\D/g, "");
      
      // 🔓 Development bypass - Testing ke liye (ONLY in non-production)
      // Specific number aur OTP se direct login ho jaye
      if (process.env.NODE_ENV !== 'production' && cleanedMobile === "9356918260" && otp === "935691") {
        return {
          success: true,
          verified: true,
        };
      }

      // OTP format validate karo (6 digits hone chahiye)
      if (!/^\d{6}$/.test(otp)) {
        return {
          success: false,
          verified: false,
        };
      }

      // Configuration check karo
      if (!this.validateOtpUrl || !this.authToken) {
        logger.error("❌ Message Central not configured properly");
        return {
          success: false,
          verified: false,
        };
      }

      // MessageCentral API call karo OTP verify karne ke liye
      const response = await axios.get(
        `${this.validateOtpUrl}?countryCode=${this.countryCode}&mobileNumber=${cleanedMobile}&verificationId=${verificationId}&customerId=${this.customerId}&code=${otp}`,
        {
          headers: {
            authToken: this.authToken,
          },
          timeout: 15000, // 15 seconds timeout
        },
      );

      // Response check karo - OTP sahi hai ya nahi
      if (response.data) {
        const isSuccess =
          response.data.responseCode === 200 ||
          response.data.responseCode === "200" ||
          response.data.status === "success" ||
          response.data.verified === true ||
          response.data.data?.verified === true;

        if (isSuccess) {
          return {
            success: true,
            verified: true,
          };
        } else {
          return {
            success: false,
            verified: false,
          };
        }
      } else {
        return {
          success: false,
          verified: false,
        };
      }
    } catch (error) {
      logger.error("❌ Message Central Verify OTP Error:", error.response?.data || error.message);

      return {
        success: false,
        verified: false,
      };
    }
  }
}

// Export karo taaki dusri files use kar sakein
module.exports = new MessageCentralOTP();
