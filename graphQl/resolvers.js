const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('./db');
require('dotenv').config();

const resolvers = {
  Query: {
    users: async () => {
      const query = 'SELECT id, username, email FROM users';
      const users = await executeQuery(query);
      return users;
    },
    posts: async () => {
      const query = 'SELECT posts.id, title, content, author_id, username FROM posts JOIN users ON posts.author_id = users.id';
      const posts = await executeQuery(query);
      return posts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        author: {
          id: post.author_id,
          username: post.username
        }
      }));
    }
  },
  Mutation: {
    register: async (_, { username, email, password }) => {
      const hashedPassword = await bcrypt.hash(password, 10);
      const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
      await executeQuery(query, [username, email, hashedPassword]);
      return "User registered successfully!";
    },
    login: async (_, { email, password }) => {
      const query = 'SELECT id, password FROM users WHERE email = ?';
      const users = await executeQuery(query, [email]);
      if (users.length === 0) {
        throw new Error('User not found');
      }
      const user = users[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        throw new Error('Invalid password');
      }
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
      return token;
    },
    updateUser: async (_, { id, username, email, password }) => {
      let query = 'UPDATE users SET ';
      const updates = [];
      const params = [];
      if (username) {
        updates.push('username = ?');
        params.push(username);
      }
      if (email) {
        updates.push('email = ?');
        params.push(email);
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.push('password = ?');
        params.push(hashedPassword);
      }
      if (updates.length === 0) {
        throw new Error('No fields to update');
      }
      query += updates.join(', ') + ' WHERE id = ?';
      params.push(id);
      await executeQuery(query, params);
      const updatedUser = await executeQuery('SELECT id, username, email FROM users WHERE id = ?', [id]);
      return updatedUser[0];
    },
    deleteUser: async (_, { id }) => {
      const query = 'DELETE FROM users WHERE id = ?';
      await executeQuery(query, [id]);
      return "User deleted successfully!";
    },
    createPost: async (_, { title, content }, { user }) => {
      if (!user) {
        throw new Error('Not authenticated');
      }
      const query = 'INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?)';
      const result = await executeQuery(query, [title, content, user.userId]);
      const post = await executeQuery('SELECT posts.id, title, content, author_id, username FROM posts JOIN users ON posts.author_id = users.id WHERE posts.id = ?', [result.insertId]);
      return {
        id: post[0].id,
        title: post[0].title,
        content: post[0].content,
        author: {
          id: post[0].author_id,
          username: post[0].username
        }
      };
    },
    updatePost: async (_, { id, title, content }) => {
      let query = 'UPDATE posts SET ';
      const updates = [];
      const params = [];
      if (title) {
        updates.push('title = ?');
        params.push(title);
      }
      if (content) {
        updates.push('content = ?');
        params.push(content);
      }
      if (updates.length === 0) {
        throw new Error('No fields to update');
      }
      query += updates.join(', ') + ' WHERE id = ?';
      params.push(id);
      await executeQuery(query, params);
      const updatedPost = await executeQuery('SELECT posts.id, title, content, author_id, username FROM posts JOIN users ON posts.author_id = users.id WHERE posts.id = ?', [id]);
      return {
        id: updatedPost[0].id,
        title: updatedPost[0].title,
        content: updatedPost[0].content,
        author: {
          id: updatedPost[0].author_id,
          username: updatedPost[0].username
        }
      };
    },
    deletePost: async (_, { id }) => {
      const query = 'DELETE FROM posts WHERE id = ?';
      await executeQuery(query, [id]);
      return "Post deleted successfully!";
    }
  }
};

module.exports = resolvers;
