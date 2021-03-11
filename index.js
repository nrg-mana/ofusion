require('dotenv').config();

const express = require('express');
const app = express();

const https = require('https');

app.get('/', (req, res) => {
	res.send('<iframe src="/be">Hello World</iframe>');
});

function processResponseError(response) {
	const { statusCode } = response;
	const contentType = response.headers['content-type'];

	let error;
	if (statusCode !== 200) {
		error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
	} else if (!/^application\/json/.test(contentType)) {
		error = new Error(
			'Invalid content-type.\n' +
				`Expected application/json but received ${contentType}`
		);
	}
	if (error) {
		console.error(error.message);
		// Consume response data to free up memory
		response.resume();
		return error;
	}
}

function _formatReviewObject(review) {
    console.log(review);
    return review.user.name + review.text;
}

function _formatLocationObject(location) {
    console.log(location);
    return location.address1 + location.address2 + location.address3 + location.city + location.zip_code + location.country + location.state;
}

function _formatBusinessObject(business) {
    console.log(business);
    return business.name + _formatLocationObject(business.location) + _formatReviewObject(business.review);
}

function formatResponseSuccess(businesses) {
    let response = '<ol>';
	Object.values(businesses).map((obj) => {
        response += _formatBusinessObject(obj);
    });
    return response + '</ol>';
}

app.get('/be', (req, res) => {
	const _k_yelpFusionAPI = process.env._k_yelpFusionAPI;

	/*
    business name
    business address (street, city)
    excerpt from a review of that business
    name of the person that wrote the review
    business information should be output in the order received from the API response
    */

	https
		.get(
			{
				path:
					'/v3/businesses/search?categories=icecream&location=Alpharetta,%20GA&sort_by=rating&limit=5',
				hostname: 'api.yelp.com',
				headers: { Authorization: 'Bearer ' + _k_yelpFusionAPI },
			},
			(business_response) => {
				if (processResponseError(business_response)) {
					res.status(500).send('Error occurred');
					return;
				}

				business_response.setEncoding('utf8');
				let rawData = '';
				business_response.on('data', (chunk) => {
					rawData += chunk;
				});
				business_response.on('end', () => {
					try {
						const parsedData = JSON.parse(rawData);
						if (parsedData.businesses && parsedData.businesses.length > 0) {
							let businesses = parsedData.businesses.reduce((map, obj) => {
								map[obj.id] = Object.assign(obj, {
									review: null,
								});
								return map;
							}, {});

							for (const [key, value] of Object.entries(businesses)) {
								https.get(
									{
										hostname: 'api.yelp.com',
										path: 'v3/businesses/' + key + '/reviews',
										headers: { Authorization: 'Bearer ' + _k_yelpFusionAPI },
									},
									(review_response) => {
										if (processResponseError(review_response)) {
											res.status(500).send('Error occurred');
											return;
										}

										review_response.setEncoding('utf8');
										let rawReview = '';
										review_response.on('data', (chunk) => {
											rawReview += chunk;
										});
										review_response.on('end', () => {
											try {
												const parsedReview = JSON.parse(rawReview);
												if (
													parsedReview.reviews &&
													parsedReview.reviews.length > 0
												) {
													businesses[key].review = parsedReview.reviews[0];

													if (
														Object.values(businesses).reduce((acc, cur) => {
															return acc && cur.review;
														}, true)
													) {
														res.send(formatResponseSuccess(businesses));
													}
												} else {
													throw new Error('Impossible, no reviews found!?');
												}
											} catch (e) {
												console.error(e.message);
												res.status(500).send(e.message);
											}
										});
									}
								);
							}
						} else {
							throw new Error('No businesses found somehow...');
						}
					} catch (e) {
						console.error(e.message);
						res.status(500).send(e.message);
					}
				});
			}
		)
		.on('error', (e) => {
			console.error(`Got error: ${e.message}`);
		});
});
app.listen(3000);
