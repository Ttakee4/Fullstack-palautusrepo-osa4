const dummy = (blogs) => {
	return 1
  }

const totalLikes = (blogs) => {
	const reducer = (sum, item) => {
		return sum + item
	}

	const likes = blogs.map(blogs => blogs.likes)

	return likes.length === 0
	  ? 0
	  : likes.reduce(reducer, 0)
}

const favoriteBlog = (blogs) => {
	const likes = blogs.map(blogs => blogs.likes)
	const favorite = blogs[likes.indexOf(Math.max(...likes))]

	return likes.length === 0
	? "no blogs to choose from"
	: {
		title: favorite.title,
		author: favorite.author,
		likes: favorite.likes
	}
}
  
module.exports = {
	dummy,
	totalLikes,
	favoriteBlog,
	mostBlogs
}