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

// Homepage: List available cars
router.get('/', (req, res) => {
    db.all(`
        SELECT cars.*, GROUP_CONCAT(car_images.image_url) AS image_urls
        FROM cars 
        LEFT JOIN car_images ON cars.id = car_images.car_id
        GROUP BY cars.id
        ORDER BY cars.id DESC
        LIMIT 6
    `, [], (err, cars) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('An error occurred while retrieving cars.');
        }

        // Convert image URLs into an array for rendering
        cars.forEach(car => {
            car.image_urls = car.image_urls ? car.image_urls.split(',') : [];
        });

        res.render('index', { cars, user: req.session.user });
    });
});


// Car Details Page
router.get('/car/:id', (req, res) => {
    const carId = req.params.id;

    db.get('SELECT * FROM cars WHERE id = ?', [carId], (err, car) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('An error occurred while retrieving the car.');
        }

        if (!car) {
            return res.status(404).send('Car not found.');
        }

        db.all('SELECT image_url FROM car_images WHERE car_id = ?', [carId], (err, images) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send('An error occurred while retrieving images.');
            }

            const imageUrls = images.map(img => img.image_url);

            // Fetch reviews for the car
            db.all('SELECT * FROM reviews WHERE car_id = ?', [carId], (err, reviews) => {
                if (err) {
                    console.error(err.message);
                    return res.status(500).send('An error occurred while retrieving reviews.');
                }

                res.render('car', { car, imageUrls, reviews, user: req.session.user });
            });
        });
    });
});

module.exports = router;
