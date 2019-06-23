var inquirer = require('inquirer');
var color = require('cli-color');
var Product = require('./product.js').Product;
var connection = require('./databaseConnection.js').connection;

// ==========
// DATABASE
// ==========

var database = {
    // initially display all items available for sale, include names prices ids 
    listItems: function (func) {
        connection.query('SELECT * FROM products WHERE stock_quantity > ?', 0, function (error, result) {
            if (error) {
                console.log(error);
            } else {
                itemArray = result;
                console.log(color.bgCyan('\nBamazon Storefront\n'));
                console.log(('id\titem\t\tprice'));
                for (var i = 0; i < itemArray.length; i++) {
                    var newProduct = new Product(itemArray[i]);
                    var id = newProduct.id
                    storefront.stockArray.push(newProduct);
                    storefront.availableIds.push(id);
                    newProduct.displayItemToCustomer();
                }
                // callback, do something after listing which might change
                func();
            }
        });
    },

    // check if there's enough stock of the product to meet request 
    checkStock: function (itemId, requestedQuantity) {
        connection.query('SELECT stock_quantity FROM products WHERE item_id = ?', itemId, function (error, result) {
            // if so: fulfill the customer's order" 
            // update the sql database to reflect the remaining quantity
            // then show the customer the total cost of their purchase 
            if (error) {
                console.log(error);
            } else {
                if (result[0].stock_quantity >= requestedQuantity) {
                    database.fulfillOrder(itemId, requestedQuantity);
                } else {
                    // if not: log insufficient quantity to the user and prevent the order from going through 
                    console.log(color.bgRed('\nTransaction cannot be completed: Insufficient quantity available!\n'));
                    storefront.checkIfAnotherOrder();
                }
            }
        })
    },

    fulfillOrder: function (itemId, purchaseQuantity) {
        var unitPrice;
        var transactionTotal;

        connection.query('UPDATE products SET stock_quantity = (stock_quantity - ?) WHERE item_id = ?', [purchaseQuantity, itemId], function (error, result) {
            if (error) {
                console.log(error);
            } else {
                database.calculateTotal(itemId, purchaseQuantity);
            }
        })
    },

    calculateTotal: function (itemId, purchaseQuantity) {
        // get product from id- will need price and dept to fulfill order and update sales logs 
        connection.query('SELECT * FROM products WHERE item_id = ?', itemId, function (error, result) {
            if (error) {
                console.log(error);
            } else {
                // create new Product 
                var soldProduct = new Product(result[0]);
                // grab price from Product
                unitPrice = soldProduct.price;
                // calculate total
                transactionTotal = unitPrice * purchaseQuantity;
                // log in database
                database.updateProductRevenue(itemId, soldProduct, transactionTotal);
            }
        });
    },

    updateProductRevenue: function (itemId, soldProduct, transactionTotal) {
        //update total sales in the products table
        connection.query('UPDATE products SET product_sales = (product_sales + ?) WHERE item_id = ?', [transactionTotal, itemId], function (error, result) {
            if (error) {
                console.log(error);
            } else {
                // log total to customer
                console.log(color.green('\nTransaction Successful! Your total is: ' + transactionTotal + '\n'));
                database.updateDepartmentSales(soldProduct, transactionTotal);
            }
        });
    },

    updateDepartmentSales: function (soldProduct, totalRevenue) {
        // update total sales in the depts table
        connection.query('UPDATE departments SET total_sales = (total_sales + ?) WHERE department_name = ?', [totalRevenue, soldProduct.dept], function (error, result) {
            if (error) {
                console.log(error);
            } else {
                storefront.checkContinue();
            }
        });
    }

};

// =================
// USER INTERACTION
// =================
var storefront = {
    'stockArray': [],
    'availableIds': [],

    // prompt user with 2 messages 
    // 1. id of product to buy
    // 2. how many units to buy 
    getOrder: function () {
        inquirer.prompt([{
                type: 'input',
                message: 'Please enter the id of the product you would like to purchase:',
                name: 'productId',
                validate: function (value) {
                    if (value.length && storefront.availableIds.indexOf(parseInt(value)) > -1) {
                        return true;
                    } else {
                        console.log(color.red('\nPlease enter the id of an available product'));
                        return;
                    }
                }
            },
            {
                type: 'input',
                message: 'Quantity to purchase:',
                name: 'purchaseQuantity',
                validate: function (value) {
                    if (value.length && !isNaN(parseInt(value)) && parseInt(value) > 0) {
                        return true;
                    } else {
                        console.log(color.red('\nQuantity must be a number greater than 0'));
                        return;
                    }
                }
            }
        ]).then(function (userData) {
            database.checkStock(userData.productId, userData.purchaseQuantity);
        })
    },

    checkIfAnotherOrder: function () {
        inquirer.prompt({
            type: 'confirm',
            message: 'Would you like to revisit the catalog and place a new order?',
            name: 'continue'
        }).then(function (userData) {
            if (userData.continue === true) {
                database.listItems(storefront.getOrder);
            } else {
                console.log(color.bgCyan('\nCome back soon!\n'));
            }
        })
    },

    checkContinue: function () {
        inquirer.prompt({
            type: 'confirm',
            message: 'Would you like to make another transaction?',
            name: 'continue'
        }).then(function (userData) {
            if (userData.continue === true) {
                database.listItems(storefront.getOrder);
            } else {
                console.log(color.bgCyan('\nCome back soon!\n'));
            }
        })
    }

};


// ==========
// INITIALIZE
// ==========

database.listItems(storefront.getOrder);