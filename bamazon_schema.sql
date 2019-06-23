-- Drops the todolist if it exists currently --
DROP DATABASE IF EXISTS bamazon;
-- Creates the "todolist" database --
CREATE DATABASE bamazon;

USE bamazon;

CREATE TABLE products
(
  item_id INT NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  department_name VARCHAR (50),
  price DECIMAL(65, 2) NOT NULL,
  stock_quantity INT NOT NULL,
  PRIMARY KEY(item_id)
);
INSERT INTO 
 products (product_name,price)
VALUES
 ('100 inch Samsung Flatscreen',$10000);