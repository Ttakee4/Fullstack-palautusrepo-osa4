const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const bcrypt = require('bcrypt')

const helper = require('./test_helper')

const Blog = require('../models/blog')
const User = require('../models/user')

describe('when there is initially some blogs saved', () => {
  beforeEach(async () => {
    await Blog.deleteMany({})
    await Blog.insertMany(helper.initialBlogs)
  })

  test('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('there are two blogs', async () => {
    const response = await api.get('/api/blogs')

    assert.strictEqual(response.body.length, 2)
  })

  describe('addition of new blog', () => {

    test('succeeds with valid data', async() => {
      const newBlog = {
        title: 'Go To Statement Considered Harmful',
        author: 'Edsger W. Dijkstra',
        url: 'http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html',
        likes: 5
      }

      await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const response = await api.get('/api/blogs')

      const authors = response.body.map(r => r.author)

      assert.strictEqual(response.body.length, helper.initialBlogs.length + 1)

      assert(authors.includes('Edsger W. Dijkstra'))
    })

    test('fails with status code 400 if author is missing', async () => {
      const newBlog = {
        title: 'Go To Statement Considered Harmful',
        url: 'http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html',
        likes: 5
      }

      await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(400)

      const response = await api.get('/api/blogs')

      assert.strictEqual(response.body.length, helper.initialBlogs.length)
    })

    test('fails with status code 400 if title is missing', async () => {
      const newBlog = {
        author: 'Edsger W. Dijkstra',
        url: 'http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html',
        likes: 5
      }

      await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(400)

      const response = await api.get('/api/blogs')

      assert.strictEqual(response.body.length, helper.initialBlogs.length)
    })

    test('fails with status code 400 if url is missing', async () => {
      const newBlog = {
        title: 'Go To Statement Considered Harmful',
        author: 'Edsger W. Dijkstra',
        likes: 5
      }

      await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(400)

      const response = await api.get('/api/blogs')

      assert.strictEqual(response.body.length, helper.initialBlogs.length)
    })

    test('succeed if the field likes is empty, add it and make it 0'), async () => {
      const newBlog = {
        title: 'Go To Statement Considered Harmful',
        author: 'Edsger W. Dijkstra',
        url: 'http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html',
      }

      await api
        .post('/api/blogs')
        .send(newBlog)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const response = await api.get('/api/blogs')

      const likes = response.body.map(r => r.likes)

      assert.strictEqual(response.body.length, helper.initialBlogs.length + 1)

      assert(likes.includes(0))
    }
  })

  describe('deletion of a blog', () => {
    test('succeed with status code 204 if id is valid', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToDelete = blogsAtStart[0]

      await api
        .delete(`/api/blogs/${blogToDelete.id}`)
        .expect(204)

      const blogsAtEnd = await helper.blogsInDb()

      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1)

      const authors = blogsAtEnd.map(r => r.author)
      assert(!authors.includes(blogToDelete.author))
    })
  })

  describe('editing of a specific blog', () => {
    test('succesfully edits a blog', async () => {
      const blogsAtStart = await helper.blogsInDb()
      const blogToUpdate = blogsAtStart[0]

      const updatedBlog = {
        title: blogsAtStart[0].title,
        author: blogsAtStart[0].author,
        url: blogsAtStart[0].url,
        likes: 42
      }

      await api
        .put(`/api/blogs/${blogToUpdate.id}`)
        .send(updatedBlog)
        .expect('Content-Type', /application\/json/)

      const blogsAtEnd = await helper.blogsInDb()

      assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)

      const oldLikes = blogsAtStart.map(r => r.likes)
      assert(oldLikes.includes(7))

      const newLikes = blogsAtEnd.map(r => r.likes)
      assert(newLikes.includes(42))
    })
  })

  describe('when there is initially one users saved', () => {
    beforeEach(async () => {
      await User.deleteMany({})

      const passwordHash = await bcrypt.hash('sekret', 10)
      const user = new User({ username: 'root', passwordHash })

      await user.save()
    })
    test('succesfully creating a valid user', async () => {
      const usersAtStart = await helper.usersInDb()

      const newUser = {
        username: 'kovaukko',
        name: 'Kova Ukko',
        password: 'salainen',
      }

      await api
        .post('/api/users')
        .send(newUser)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const usersAtEnd = await helper.usersInDb()
      assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)

      const usernames = usersAtEnd.map(u => u.username)
      assert(usernames.includes(newUser.username))
    })

    test('trying to create user with non-unique username', async () => {
      const usersAtStart = await helper.usersInDb()

      const newUser = {
        username: 'root',
        name: 'Kova Ukko',
        password: 'salainen',
      }

      await api
        .post('/api/users')
        .send(newUser)
        .expect(400)

      const usersAtEnd = await helper.usersInDb()
      assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })

    test('trying to create user with too short username', async () => {
      const usersAtStart = await helper.usersInDb()

      const newUser = {
        username: 'ku',
        name: 'Kova Ukko',
        password: 'salainen',
      }

      await api
        .post('/api/users')
        .send(newUser)
        .expect(400)

      const usersAtEnd = await helper.usersInDb()
      assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })

    test('trying to create user with no password', async () => {
      const usersAtStart = await helper.usersInDb()

      const newUser = {
        username: 'kovaukko',
        name: 'Kova Ukko'
      }

      await api
        .post('/api/users')
        .send(newUser)
        .expect(400)

      const usersAtEnd = await helper.usersInDb()
      assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })

    test('trying to create user with a too short password', async () => {
      const usersAtStart = await helper.usersInDb()

      const newUser = {
        username: 'kovaukko',
        name: 'Kova Ukko',
        password: 'lo'
      }

      await api
        .post('/api/users')
        .send(newUser)
        .expect(400)

      const usersAtEnd = await helper.usersInDb()
      assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })
  })
})

after(async () => {
  await mongoose.connection.close()
})