const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();

const db = new sqlite3.Database('./database/rental.db');

// Middleware to check if the user is logged in
function ensureAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/auth/login');
}

// Get the booking form for a specific car
router.get('/book/:carId', ensureAuthenticated, (req, res) => {
    const carId = req.params.carId;

    // Fetch car details from the database
    db.get('SELECT * FROM cars WHERE id = ?', [carId], (err, car) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error retrieving car details.');
        }

        if (!car) {
            return res.status(404).send('Car not found.');
        }

        // Assuming `req.session.user` contains the logged-in user's details
        const user = req.session.user;
        
        res.render('booking-form', {
            user,
            car
        });
    });
});

// Booking form submission
router.post('/book/:carId', ensureAuthenticated, (req, res) => {
    const { carId } = req.params;
    const { userName, userSurname, carName, rentalDate, returnDate, totalCost } = req.body;

    // Log the received data
    console.log('Booking Data:', req.body);

    // Validate all fields
    if (!userName || !userSurname || !carName || !rentalDate || !returnDate || !totalCost) {
        return res.status(400).send('Please provide all required fields.');
    }

    // Save the booking to the database
    db.run(`
        INSERT INTO bookings (car_id, car_name, user_name, user_surname, rental_date, return_date, total_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [carId, carName, userName, userSurname, rentalDate, returnDate, totalCost], function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Error saving the booking.');
        }

        res.redirect(`/car/${carId}`); // Redirect to booking confirmation
    });
});


module.exports = router;
