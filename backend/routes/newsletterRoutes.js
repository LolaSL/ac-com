import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import crypto from 'crypto';
import Newsletter from '../models/newsletterModel.js';
import { sendEmail, isAuth, isAdmin, baseUrl } from '../utils.js';

const newsletterRouter = express.Router();

// Subscribe to newsletter
newsletterRouter.post('/subscribe', expressAsyncHandler(async (req, res) => {
    const { email, preferences } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    try {
        // Check if email already exists
        const existingSubscriber = await Newsletter.findOne({ email: email.toLowerCase() });

        if (existingSubscriber) {
            if (existingSubscriber.subscriptionStatus === 'active') {
                return res.status(400).json({ message: 'This email is already subscribed to our newsletter' });
            } else if (existingSubscriber.subscriptionStatus === 'unsubscribed') {
                // Reactivate subscription
                existingSubscriber.subscriptionStatus = 'active';
                existingSubscriber.subscriptionDate = new Date();
                existingSubscriber.unsubscribeDate = undefined;
                existingSubscriber.unsubscribeToken = undefined;
                if (preferences) {
                    existingSubscriber.preferences = { ...existingSubscriber.preferences, ...preferences };
                }
                await existingSubscriber.save();

                return res.json({
                    message: 'Successfully resubscribed to newsletter!',
                    subscriber: {
                        email: existingSubscriber.email,
                        preferences: existingSubscriber.preferences,
                        subscriptionDate: existingSubscriber.subscriptionDate
                    }
                });
            }
        }

        // Create new subscriber
        const subscriber = new Newsletter({
            email: email.toLowerCase(),
            preferences: {
                newFeatures: true,
                pricingUpdates: true,
                industryInsights: true,
                promotions: false,
                ...preferences
            }
        });

        await subscriber.save();

        // Send welcome email (only if Gmail is configured)
        if (process.env.GMAIL_USER) {
            try {
                await sendEmail({
                    to: subscriber.email,
                    subject: 'Welcome to AC Commerce Newsletter!',
                    html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066ff;">Welcome to AC Commerce!</h2>
            <p>Thank you for subscribing to our newsletter. You'll receive updates on:</p>
            <ul>
              <li>New features and platform updates</li>
              <li>Pricing options and special offers</li>
              <li>Industry insights and best practices</li>
            </ul>
            <p>You can manage your preferences or unsubscribe at any time from our website.</p>
            <p>Best regards,<br>The AC Commerce Team</p>
          </div>
        `
                });
            } catch (emailError) {
                console.error('Failed to send welcome email:', emailError);
                // Don't fail the subscription if email fails
            }
        } else {
            console.log('Gmail not configured - skipping welcome email');
        }

        res.status(201).json({
            message: 'Successfully subscribed to newsletter!',
            subscriber: {
                email: subscriber.email,
                preferences: subscriber.preferences,
                subscriptionDate: subscriber.subscriptionDate
            }
        });

    } catch (error) {
        console.error('Newsletter subscription error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'This email is already subscribed' });
        }
        res.status(500).json({ message: 'Failed to subscribe. Please try again.' });
    }
}));

// Unsubscribe from newsletter
newsletterRouter.post('/unsubscribe', expressAsyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const subscriber = await Newsletter.findOne({ email: email.toLowerCase() });

        if (!subscriber) {
            return res.status(404).json({ message: 'Email not found in our newsletter list' });
        }

        if (subscriber.subscriptionStatus === 'unsubscribed') {
            return res.json({ message: 'You have already unsubscribed from our newsletter' });
        }

        // Generate unsubscribe token for email verification
        const unsubscribeToken = crypto.randomBytes(32).toString('hex');
        subscriber.subscriptionStatus = 'unsubscribed';
        subscriber.unsubscribeDate = new Date();
        subscriber.unsubscribeToken = unsubscribeToken;

        await subscriber.save();

        // Send confirmation email (only if Gmail is configured)
        if (process.env.GMAIL_USER) {
            try {
                await sendEmail({
                    to: subscriber.email,
                    subject: 'Newsletter Unsubscription Confirmed',
                    html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066ff;">Unsubscription Confirmed</h2>
            <p>You have been successfully unsubscribed from the AC Commerce newsletter.</p>
            <p>If you change your mind, you can always resubscribe from our website.</p>
            <p>Thank you for your interest in AC Commerce.</p>
            <p>Best regards,<br>The AC Commerce Team</p>
          </div>
        `
                });
            } catch (emailError) {
                console.error('Failed to send unsubscription confirmation:', emailError);
            }
        } else {
            console.log('Gmail not configured - skipping unsubscription confirmation email');
        }

        res.json({
            message: 'Successfully unsubscribed from newsletter',
            unsubscribedAt: subscriber.unsubscribeDate
        });

    } catch (error) {
        console.error('Newsletter unsubscription error:', error);
        res.status(500).json({ message: 'Failed to unsubscribe. Please try again.' });
    }
}));

// Unsubscribe via token (for email links)
newsletterRouter.get('/unsubscribe/:token', expressAsyncHandler(async (req, res) => {
    const { token } = req.params;

    try {
        const subscriber = await Newsletter.findOne({ unsubscribeToken: token });

        if (!subscriber) {
            return res.status(404).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #dc3545;">Invalid Unsubscribe Link</h2>
            <p>This unsubscribe link is invalid or has expired.</p>
            <p>Please contact support if you need assistance.</p>
          </body>
        </html>
      `);
        }

        if (subscriber.subscriptionStatus === 'unsubscribed') {
            return res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #28a745;">Already Unsubscribed</h2>
            <p>You have already been unsubscribed from our newsletter.</p>
            <p>Thank you for your previous interest in AC Commerce.</p>
          </body>
        </html>
      `);
        }

        subscriber.subscriptionStatus = 'unsubscribed';
        subscriber.unsubscribeDate = new Date();
        subscriber.unsubscribeToken = undefined; // Clear token after use

        await subscriber.save();

        res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #28a745;">Successfully Unsubscribed</h2>
          <p>You have been successfully unsubscribed from the AC Commerce newsletter.</p>
          <p>If you change your mind, you can always resubscribe from our website.</p>
          <p>Thank you for your interest in AC Commerce.</p>
        </body>
      </html>
    `);

    } catch (error) {
        console.error('Token unsubscription error:', error);
        res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #dc3545;">Error</h2>
          <p>Something went wrong. Please try again or contact support.</p>
        </body>
      </html>
    `);
    }
}));

// Get subscriber preferences (for logged-in users to manage preferences)
newsletterRouter.get('/preferences/:email', expressAsyncHandler(async (req, res) => {
    const { email } = req.params;

    try {
        const subscriber = await Newsletter.findOne({
            email: email.toLowerCase(),
            subscriptionStatus: 'active'
        });

        if (!subscriber) {
            return res.status(404).json({ message: 'Subscriber not found' });
        }

        res.json({
            email: subscriber.email,
            preferences: subscriber.preferences,
            subscriptionDate: subscriber.subscriptionDate
        });

    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({ message: 'Failed to retrieve preferences' });
    }
}));

// Update subscriber preferences
newsletterRouter.put('/preferences', expressAsyncHandler(async (req, res) => {
    const { email, preferences } = req.body;

    if (!email || !preferences) {
        return res.status(400).json({ message: 'Email and preferences are required' });
    }

    try {
        const subscriber = await Newsletter.findOne({
            email: email.toLowerCase(),
            subscriptionStatus: 'active'
        });

        if (!subscriber) {
            return res.status(404).json({ message: 'Subscriber not found' });
        }

        subscriber.preferences = { ...subscriber.preferences, ...preferences };
        await subscriber.save();

        res.json({
            message: 'Preferences updated successfully',
            preferences: subscriber.preferences
        });

    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ message: 'Failed to update preferences' });
    }
}));

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

// Get all subscribers (admin only)
newsletterRouter.get('/admin/subscribers', isAuth, isAdmin, expressAsyncHandler(async (req, res) => {
    const { status, page = 1, limit = 50 } = req.query;
    const query = status ? { subscriptionStatus: status } : {};

    const total = await Newsletter.countDocuments(query);
    const subscribers = await Newsletter.find(query)
        .sort({ subscriptionDate: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    res.json({
        subscribers,
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
    });
}));

// Get newsletter stats (admin only)
newsletterRouter.get('/admin/stats', isAuth, isAdmin, expressAsyncHandler(async (req, res) => {
    const [active, unsubscribed, bounced, total] = await Promise.all([
        Newsletter.countDocuments({ subscriptionStatus: 'active' }),
        Newsletter.countDocuments({ subscriptionStatus: 'unsubscribed' }),
        Newsletter.countDocuments({ subscriptionStatus: 'bounced' }),
        Newsletter.countDocuments(),
    ]);

    // Subscribers in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSubscribers = await Newsletter.countDocuments({
        subscriptionDate: { $gte: thirtyDaysAgo },
        subscriptionStatus: 'active',
    });

    res.json({ active, unsubscribed, bounced, total, recentSubscribers });
}));

// Send newsletter to all active subscribers (admin only)
newsletterRouter.post('/admin/send', isAuth, isAdmin, expressAsyncHandler(async (req, res) => {
    const { subject, template, customHtml } = req.body;

    if (!subject) {
        return res.status(400).json({ message: 'Subject is required' });
    }

    if (!template && !customHtml) {
        return res.status(400).json({ message: 'Template or custom HTML is required' });
    }

    const subscribers = await Newsletter.find({ subscriptionStatus: 'active' });

    if (subscribers.length === 0) {
        return res.status(400).json({ message: 'No active subscribers found' });
    }

    const appUrl = baseUrl();
    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const subscriber of subscribers) {
        try {
            // Generate unsubscribe token if not exists
            if (!subscriber.unsubscribeToken) {
                subscriber.unsubscribeToken = crypto.randomBytes(32).toString('hex');
                await subscriber.save();
            }

            const unsubscribeUrl = `${appUrl}/api/newsletter/unsubscribe/${subscriber.unsubscribeToken}`;

            let html;
            if (customHtml) {
                html = customHtml;
            } else {
                html = buildNewsletterHtml(template, subscriber.email, unsubscribeUrl, appUrl);
            }

            // Always append unsubscribe footer
            html += buildUnsubscribeFooter(unsubscribeUrl);

            await sendEmail({ to: subscriber.email, subject, html });
            sent++;
        } catch (err) {
            failed++;
            errors.push({ email: subscriber.email, error: err.message });
            console.error(`Failed to send to ${subscriber.email}:`, err.message);
        }
    }

    res.json({
        message: `Newsletter sent: ${sent} delivered, ${failed} failed out of ${subscribers.length} subscribers`,
        sent,
        failed,
        total: subscribers.length,
        errors: errors.length > 0 ? errors : undefined,
    });
}));

// ── Newsletter HTML template builder ──
function buildNewsletterHtml(template, email, unsubscribeUrl, appUrl) {
    const templates = {
        welcome: {
            heading: 'Welcome to AC Commerce!',
            body: `
                <p>We're thrilled to have you join our HVAC marketplace community.</p>
                <p>Here's what you can explore:</p>
                <ul style="padding-left: 20px; color: #4a5568;">
                    <li><strong>BTU Calculator</strong> — Find the perfect AC size for any room</li>
                    <li><strong>ROI Calculator</strong> — See real savings on HVAC installations</li>
                    <li><strong>Trusted Providers</strong> — Connect with certified service professionals</li>
                    <li><strong>Premium Products</strong> — Browse our curated AC catalog</li>
                </ul>
                <p>Start exploring today and save on your next HVAC project!</p>`,
            ctaText: 'Explore Products',
            ctaUrl: `${appUrl}/search`,
        },
        newProducts: {
            heading: 'New Products Just Arrived!',
            body: `
                <p>We've added exciting new HVAC products to our marketplace.</p>
                <p>From energy-efficient mini splits to smart thermostats, find the perfect solution for your home or business.</p>
                <p>Check out the latest additions and take advantage of competitive pricing.</p>`,
            ctaText: 'View New Products',
            ctaUrl: `${appUrl}/search`,
        },
        seasonalDeals: {
            heading: 'Seasonal HVAC Deals',
            body: `
                <p>Get ready for the season with exclusive deals on AC installations, maintenance packages, and premium equipment.</p>
                <p>Whether you need a new system or a tune-up, now is the best time to save.</p>
                <ul style="padding-left: 20px; color: #4a5568;">
                    <li>Up to competitive savings on popular split systems</li>
                    <li>Discounted installation service bundles</li>
                    <li>Free BTU assessment with any purchase</li>
                </ul>`,
            ctaText: 'View Deals',
            ctaUrl: `${appUrl}/search`,
        },
        maintenance: {
            heading: 'Time for AC Maintenance!',
            body: `
                <p>Regular maintenance keeps your HVAC system running efficiently and extends its lifespan.</p>
                <p>Our certified service providers offer comprehensive maintenance packages including:</p>
                <ul style="padding-left: 20px; color: #4a5568;">
                    <li>Full system inspection and cleaning</li>
                    <li>Refrigerant level check and top-up</li>
                    <li>Filter replacement and airflow optimization</li>
                    <li>Performance report with efficiency recommendations</li>
                </ul>
                <p>Book your maintenance appointment today!</p>`,
            ctaText: 'Find Service Providers',
            ctaUrl: `${appUrl}/search`,
        },
        btuCalculator: {
            heading: 'Find Your Perfect AC Size',
            body: `
                <p>Not sure what AC size you need? Our BTU Calculator takes the guesswork out of choosing the right system.</p>
                <p>Simply enter your room dimensions, insulation type, and climate zone — and get an instant recommendation with matched products.</p>
                <p>Stop overpaying for oversized units or suffering with undersized ones.</p>`,
            ctaText: 'Try BTU Calculator',
            ctaUrl: `${appUrl}/btu-calculator`,
        },
        roiInsights: {
            heading: 'Your HVAC ROI Report',
            body: `
                <p>Smart HVAC investments pay for themselves. Our ROI Calculator shows you exactly how much you'll save.</p>
                <p>Compare traditional vs. AC Commerce pricing, calculate payback periods, and make data-driven decisions for your projects.</p>
                <p>Contractors and homeowners alike are seeing significant savings through our platform.</p>`,
            ctaText: 'Calculate Your ROI',
            ctaUrl: `${appUrl}/roi-calculator`,
        },
        hvacDesign: {
            heading: 'Design Your HVAC System Online',
            body: `
                <p>Did you know you can upload your apartment or flat floor plan and design your entire HVAC system right on our platform?</p>
                <p>Here's how it works:</p>
                <ol style="padding-left: 20px; color: #4a5568;">
                    <li><strong>Upload your PDF floor plan</strong> — any apartment, house, or commercial space drawing</li>
                    <li><strong>Place HVAC units on the plan</strong> — drag and drop indoor AC units, condensers, and more</li>
                    <li><strong>Submit for engineer review</strong> — our professionals verify your layout</li>
                    <li><strong>Get a complete design</strong> — with refrigerant lines, and soon duct and diffuser placement</li>
                </ol>
                <p>No HVAC experience needed — our tools guide you through every step.</p>`,
            ctaText: 'Start Your Design',
            ctaUrl: `${appUrl}/btu-calculator`,
        },
        engineerReview: {
            heading: 'Professional Engineers Review Your Design',
            body: `
                <p>Your HVAC design deserves expert eyes. When you submit your floor plan with placed AC units, our certified engineers:</p>
                <ul style="padding-left: 20px; color: #4a5568;">
                    <li><strong>Verify unit placement</strong> — ensure optimal airflow and coverage</li>
                    <li><strong>Add refrigerant lines</strong> — precise routing between indoor and outdoor units</li>
                    <li><strong>Check BTU calculations</strong> — confirm each room has the right capacity</li>
                    <li><strong>Coming soon:</strong> Duct routing and diffuser placement for ducted systems</li>
                </ul>
                <p>Get peace of mind knowing your installation plan is reviewed by professionals before you buy.</p>`,
            ctaText: 'Upload Your Floor Plan',
            ctaUrl: `${appUrl}/btu-calculator`,
        },
        smartBtuSizing: {
            heading: 'The Right AC for Every Room — Automatically',
            body: `
                <p>Our BTU Calculator doesn\'t just calculate cooling needs — it recommends the exact products you need.</p>
                <p>Here\'s what makes it powerful:</p>
                <ul style="padding-left: 20px; color: #4a5568;">
                    <li><strong>Room-by-room BTU calculation</strong> — based on dimensions, insulation, windows, and sun exposure</li>
                    <li><strong>Automatic AC matching</strong> — suggests the right indoor unit for each room from our catalog</li>
                    <li><strong>Outdoor unit pairing</strong> — recommends the correct condenser to match your indoor units</li>
                    <li><strong>One-click add to cart</strong> — purchase all recommended units instantly</li>
                </ul>
                <p>From calculation to purchase in minutes — no guesswork, no oversizing, no wasted money.</p>`,
            ctaText: 'Calculate Your BTU Needs',
            ctaUrl: `${appUrl}/btu-calculator`,
        },
    };

    const t = templates[template];
    if (!t) {
        return `<p>Newsletter content</p>`;
    }

    return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0 0 8px; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">AC Commerce</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 0; font-size: 14px;">Your Trusted HVAC Marketplace</p>
        </div>

        <!-- Body -->
        <div style="padding: 36px 30px; color: #2d3748; font-size: 15px; line-height: 1.7;">
            <h2 style="color: #1a202c; font-size: 22px; font-weight: 700; margin: 0 0 20px;">${t.heading}</h2>
            ${t.body}

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0 16px;">
                <a href="${t.ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(99,102,241,0.3);">${t.ctaText}</a>
            </div>
        </div>

        <!-- Divider -->
        <div style="height: 1px; background: #e2e8f0; margin: 0 30px;"></div>

        <!-- Footer -->
        <div style="padding: 24px 30px; text-align: center; color: #a0aec0; font-size: 12px;">
            <p style="margin: 0 0 8px;">AC Commerce — HVAC Solutions Marketplace</p>
            <p style="margin: 0;">You're receiving this because you subscribed at <a href="${appUrl}" style="color: #6366f1; text-decoration: none;">${appUrl}</a></p>
        </div>
    </div>`;
}

function buildUnsubscribeFooter(unsubscribeUrl) {
    return `
    <div style="max-width: 600px; margin: 0 auto; padding: 16px 30px; text-align: center; font-size: 11px; color: #a0aec0;">
        <p style="margin: 0;">Don't want these emails? <a href="${unsubscribeUrl}" style="color: #6366f1; text-decoration: underline;">Unsubscribe</a></p>
    </div>`;
}

export default newsletterRouter;