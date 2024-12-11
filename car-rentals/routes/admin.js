const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = new sqlite3.Database('./database/rental.db');

// Configure multer for storing multiple images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads'); // Directory to save uploaded images
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Unique filename
    }
});
const upload = multer({ storage });

// Middleware to ensure admin access
function ensureAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.redirect('/auth/login');
}

// Admin Dashboard: Show all cars
router.get('/cars', ensureAdmin, (req, res) => {
    db.all('SELECT * FROM cars', [], (err, cars) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('An error occurred while retrieving cars.');
        }
        res.render('admin', { cars, user: req.session.user });
    });
});

// Add a new car with multiple images
router.post('/add-car', ensureAdmin, upload.array('images', 5), (req, res) => {
    try {
        const {
            brand, model, year, name, type, transmission, fuel_type,
            seating_capacity, mileage, price_per_day, description
        } = req.body;

        const upload_date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const upload_time = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS

        // Insert car details into the database
        db.run(`
            INSERT INTO cars (
                brand, 
                model, 
                year, 
                name, 
                type, 
                transmission, 
                fuel_type,
                seating_capacity, 
                mileage, 
                price_per_day, 
                description,
                upload_date, 
                upload_time,available
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,"available")
        `, [
                brand, 
                model, 
                year, 
                name, 
                type, 
                transmission, 
                fuel_type,
                seating_capacity, 
                mileage, 
                price_per_day, 
                description,
                upload_date, upload_time
            ], function (err) {
            if (err) {
                console.error(err.message);
                return res.status(500).send("Error adding car to the database.");
            }

            const carId = this.lastID; // Newly added car's ID

            // Handle image uploads
            const images = req.files;
            if (images && images.length > 0) {
                const insertImageStmt = db.prepare(`
                    INSERT INTO car_images (car_id, image_url)
                    VALUES (?, ?)
                `);

                images.forEach(image => {
                    const imageUrl = `/uploads/${image.filename}`;
                    insertImageStmt.run(carId, imageUrl);
                });

                insertImageStmt.finalize();
            }

            res.redirect('/admin/cars');
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Unexpected error occurred.');
        res.redirect('error404');
    }
});

// Delete a car
router.post('/delete-car/:id', ensureAdmin, (req, res) => {
    const carId = req.params.id;

    db.run('DELETE FROM cars WHERE id = ?', [carId], (err) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Failed to delete car.');
        }
        res.redirect('/admin/cars');
    });
});

// View all bookings
router.get('/bookings', ensureAdmin, (req, res) => {
    db.all(`
        SELECT bookings.*, cars.model, cars.brand, users.name, users.surname
        FROM bookings
        JOIN cars ON bookings.car_id = cars.id
        JOIN users ON bookings.customer_id = users.id
    `, [], (err, bookings) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('An error occurred while retrieving bookings.');
        }
        res.render('admin-bookings', { bookings, user: req.session.user });
    });
});

// Approve a booking
router.post('/approve-booking/:id', ensureAdmin, (req, res) => {
    const bookingId = req.params.id;

    db.run('UPDATE bookings SET status = "approved" WHERE id = ?', [bookingId], (err) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Failed to approve booking.');
        }
        res.redirect('/admin/bookings');
    });
});

// Cancel a booking
router.post('/cancel-booking/:id', ensureAdmin, (req, res) => {
    const bookingId = req.params.id;

    db.run('UPDATE bookings SET status = "cancelled" WHERE id = ?', [bookingId], (err) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Failed to cancel booking.');
        }
        res.redirect('/admin/bookings');
    });
});

module.exports = router;
