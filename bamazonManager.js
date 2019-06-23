// =============
// DEPENDENCIES
// =============

var inquirer = require('inquirer');
var color = require('cli-color');
var Product = require('./product.js').Product;
var connection = require('./databaseConnection.js').connection;

// =================
// USER INTERACTION
// =================

var workplace = {
    'stockArray': [],
    'availableIds': [],

    // List a set of menu options:
    selectAction: function () {
        inquirer.prompt({
            type: 'list',
            message: 'You are logged in to the Bamazon Workplace. What would you like to do?',
            name: 'selectedAction',
            choices: ['View Products For Sale', 'View Low Inventory', 'Add to Inventory', 'Add New Product']
        }).then(function (userData) {
            switch (userData.selectedAction) {
                case 'View Products For Sale':
                    database.listAllProducts(workplace.checkContinue);
                    break;
                case 'View Low Inventory':
                    database.listLowInventory(workplace.checkContinue);
                    break;
                case 'Add to Inventory':
                    database.listAllProducts(workplace.addWhichInventory);
                    // workplace.addWhichInventory();
                    break;
                case 'Add New Product':
                    workplace.addWhichProduct();
                    break;
                default:
                    database.listAllProducts();
            }
        })
    },

    // If a manager selects Add to Inventory, your app should display a prompt that will let the manager "add more" of any item currently in the store.
    addWhichInventory: function () {
        inquirer.prompt([{
                type: 'input',
                message: 'Enter the item id',
                name: 'itemId',
                validate: function (value) {
                    if (value.length && workplace.availableIds.indexOf(parseInt(value)) > -1) {
                        return true;
                    } else {
                        console.log(color.red('\nPlease enter the id of an available product'));
                        return;
                    }
                }
            },
            {
                type: 'input',
                message: 'Enter quantity to add',
                name: 'addQuantity',
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
            database.addStockToInventory(userData.itemId, userData.addQuantity, workplace.checkContinue);
        })
    },

    // If a manager selects Add New Product, it should allow the manager to add a completely new product to the store.
    addWhichProduct: function () {
        inquirer.prompt([{
                type: 'input',
                message: 'Enter the item name',
                name: 'product_name'
            },
            {
                type: 'input',
                message: 'Enter the department',
                name: 'department_name'
            },
            {
                type: 'input',
                message: 'Enter the unit price',
                name: 'price'
            },
            {
                type: 'input',
                message: 'Enter the stock quantity to add',
                name: 'stock_quantity'
            }
        ]).then(function (userData) {
            database.addItemToInventory(userData, workplace.checkContinue);
        })
    },

    checkContinue: function () {
        inquirer.prompt({
            type: 'confirm',
            message: 'Would you like to make another transaction?',
            name: 'continue'
        }).then(function (userData) {
            if (userData.continue === true) {
                workplace.selectAction();
            } else {
                console.log(color.bgCyan('\nYou have been successfully logged out of the Bamazon workplace.\n'));
            }
        });
    }
};

// =========
// DATABASE
// =========

var database = {
    // list every available item: the item IDs, names, prices, and quantities.
    listAllProducts: function (func) {
        connection.query('SELECT * FROM products', function (error, result) {
            if (error) {
                console.log(error);
            } else {
                console.log(color.bgYellow('\nBamazon Workplace - All Products \n'));
                console.log(('id\titem\t\tprice\tquantity'));
                for (var i = 0; i < result.length; i++) {
                    var newProduct = new Product(result[i]);
                    var id = newProduct.id;
                    workplace.availableIds.push(id);
                    workplace.stockArray.push(newProduct);
                    newProduct.displayItemToManager();
                }

                func(); // callback
            }
        });
    },

    // list all items with a inventory count lower than five.
    listLowInventory: function (func) {
        connection.query('SELECT * FROM products WHERE stock_quantity < ?', 5, function (error, result) {
            if (error) {
                console.log(error);
            } else {
                console.log(color.bgRed('\nBamazon Workplace - Low Inventory\n'));
                console.log(('id\titem\t\tprice\tquantity'));
                for (var i = 0; i < result.length; i++) {
                    var newProduct = new Product(result[i]);
                    workplace.stockArray.push(newProduct);
                    newProduct.displayItemToManager();
                }

                func(); // callback
            }
        });
    },

    // increase inventory of any item currently in the store.
    addStockToInventory: function (itemId, addQuantity, func) {
        connection.query('UPDATE products SET stock_quantity = (stock_quantity + ?) WHERE item_id = ?', [addQuantity, itemId], function (error, result) {
            if (error) {
                console.log(error);
            } else {
                connection.query('SELECT * FROM products WHERE item_id = ?', itemId, function (error, result) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log(color.bgGreen('\nInventory add successful!\n'));
                        console.log(('id\titem\t\tprice\tquantity'));
                        var updatedProduct = new Product(result[0]);
                        updatedProduct.displayItemToManager();

                        func(); //callback
                    }
                });
            }
        });
    },

    //add a completely new product to the store.
    addItemToInventory: function (product, func) {
        connection.query(
            `INSERT INTO products (
        product_name, 
        department_name,
        price,
        stock_quantity
      ) VALUES
      (?, ?, ?, ?);
      `, [product.product_name, product.department_name, product.price, product.stock_quantity],
            function (error, result) {
                if (error) {
                    console.log(error);
                } else {
                    // get id it was inserted to and add it to the object 
                    var insertId = result.insertId;
                    product.item_id = insertId;
                    console.log(color.bgGreen('\nProduct add successful!\n'));
                    console.log(('id\titem\t\tprice\tquantity'));
                    var newProduct = new Product(product);
                    newProduct.displayItemToManager();

                    func(); // callback
                }
            });
    }
};


workplace.selectAction();