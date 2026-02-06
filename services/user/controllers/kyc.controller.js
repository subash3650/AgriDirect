const Farmer = require('../models/Farmer');
const { asyncHandler, AppError } = require('../../shared/middleware/errorHandler');

// Submit KYC - Farmer submits bank details
exports.submitKYC = asyncHandler(async (req, res, next) => {
    const { accountNumber, ifscCode, accountHolderName } = req.body;

    if (!accountNumber || !ifscCode || !accountHolderName) {
        return next(new AppError('All bank details are required', 400));
    }

    // Basic IFSC validation (11 characters, first 4 letters, 5th is 0, last 6 alphanumeric)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode.toUpperCase())) {
        return next(new AppError('Invalid IFSC code format', 400));
    }

    const farmer = await Farmer.findById(req.user._id);
    if (!farmer) {
        return next(new AppError('Farmer not found', 404));
    }

    farmer.bankDetails = {
        accountNumber,
        ifscCode: ifscCode.toUpperCase(),
        accountHolderName
    };
    // Auto-verify for MVP (in production, this would be 'pending' for admin review)
    farmer.kycStatus = 'verified';
    await farmer.save();

    res.json({
        success: true,
        message: 'Bank details submitted and verified successfully',
        kycStatus: farmer.kycStatus
    });
});

// Get KYC Status
exports.getKYCStatus = asyncHandler(async (req, res, next) => {
    const farmer = await Farmer.findById(req.user._id).select('kycStatus bankDetails acceptsCash walletBalance');
    if (!farmer) {
        return next(new AppError('Farmer not found', 404));
    }

    // Mask account number for security
    let maskedAccount = null;
    if (farmer.bankDetails?.accountNumber) {
        const accNum = farmer.bankDetails.accountNumber;
        maskedAccount = '****' + accNum.slice(-4);
    }

    res.json({
        success: true,
        kycStatus: farmer.kycStatus,
        bankDetails: farmer.bankDetails ? {
            accountNumber: maskedAccount,
            ifscCode: farmer.bankDetails.ifscCode,
            accountHolderName: farmer.bankDetails.accountHolderName
        } : null,
        acceptsCash: farmer.acceptsCash,
        walletBalance: farmer.walletBalance
    });
});

// Update cash acceptance preference
exports.updateCashPreference = asyncHandler(async (req, res, next) => {
    const { acceptsCash } = req.body;

    if (typeof acceptsCash !== 'boolean') {
        return next(new AppError('acceptsCash must be a boolean', 400));
    }

    const farmer = await Farmer.findByIdAndUpdate(
        req.user._id,
        { acceptsCash },
        { new: true }
    );

    if (!farmer) {
        return next(new AppError('Farmer not found', 404));
    }

    res.json({
        success: true,
        message: `Cash payments ${acceptsCash ? 'enabled' : 'disabled'}`,
        acceptsCash: farmer.acceptsCash
    });
});

// Get wallet balance
exports.getWalletBalance = asyncHandler(async (req, res, next) => {
    const farmer = await Farmer.findById(req.user._id).select('walletBalance');
    if (!farmer) {
        return next(new AppError('Farmer not found', 404));
    }

    res.json({
        success: true,
        walletBalance: farmer.walletBalance
    });
});
