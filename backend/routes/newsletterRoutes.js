import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import crypto from 'crypto';
import Newsletter from '../models/newsletterModel.js';
import { mailgun } from '../utils.js';

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

        // Send welcome email (only if SendGrid is configured)
        if (process.env.SENDGRID_API_KEY) {
            try {
                const welcomeData = {
                    to: subscriber.email,
                    from: {
                        email: 'your-gmail@gmail.com', // Replace with your verified Gmail address
                        name: 'AC Commerce'
                    },
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
                };

                await mailgun().send(welcomeData);
            } catch (emailError) {
                console.error('Failed to send welcome email:', emailError);
                // Don't fail the subscription if email fails
            }
        } else {
            console.log('SendGrid not configured - skipping welcome email');
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

        // Send confirmation email (only if SendGrid is configured)
        if (process.env.SENDGRID_API_KEY) {
            try {
                const confirmationData = {
                    to: subscriber.email,
                    from: {
                        email: 'your-gmail@gmail.com', // Replace with your verified Gmail address
                        name: 'AC Commerce'
                    },
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
                };

                await mailgun().send(confirmationData);
            } catch (emailError) {
                console.error('Failed to send unsubscription confirmation:', emailError);
            }
        } else {
            console.log('SendGrid not configured - skipping unsubscription confirmation email');
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

export default newsletterRouter;