-- MySQL dump 10.13  Distrib 9.5.0, for macos26.0 (arm64)
--
-- Host: 127.0.0.1    Database: palu
-- ------------------------------------------------------
-- Server version	9.5.0
--
-- Table structure for table `books`
--

DROP TABLE IF EXISTS `books`;
CREATE TABLE `books` (
  `id` varchar(256) NOT NULL,
  `title` varchar(256) NOT NULL,
  `authors` varchar(256) DEFAULT NULL,
  `publisher` varchar(256) DEFAULT NULL,
  `published_date` varchar(256) DEFAULT NULL,
  `description` text,
  `isbn13` varchar(256) DEFAULT NULL,
  `page_count` int DEFAULT NULL,
  `categories` varchar(512) DEFAULT NULL,
  `language` varchar(10) DEFAULT NULL,
  `images` text,
  PRIMARY KEY (`id`)
);

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(256) NOT NULL,
  `password` varchar(512) NOT NULL,
  `username` varchar(256) NOT NULL,
  `nickname` varchar(256) NOT NULL,
  `bio` text,
  `login_attempt` int DEFAULT 0,
  `last_login_attempt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
);

--
-- Table structure for table `users_books`
--

DROP TABLE IF EXISTS `users_books`;
CREATE TABLE `users_books` (
  `book_id` varchar(256) NOT NULL,
  `user_id` int NOT NULL,
  `status` enum('WISHLIST','POSSESSION') DEFAULT NULL,
  `current_page` int DEFAULT NULL,
  PRIMARY KEY (`book_id`,`user_id`),
  KEY `users_books_users_id_fk` (`user_id`),
  CONSTRAINT `users_books_books_id_fk` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE,
  CONSTRAINT `users_books_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
-- Dump completed on 2026-01-23 13:20:45
