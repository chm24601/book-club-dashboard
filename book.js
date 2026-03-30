<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Book Details</title>

  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <h1 class="title">The Book Club for Difficult Women</h1>

  <main class="book-detail-page">
    <a class="back-link" href="books.html">← Back to all books</a>

    <div id="book-detail-container">
      <p>Loading book details...</p>
    </div>

    <section class="entry-form-section">
      <h3>Add your thoughts</h3>

      <form id="entry-form">
        <label for="memberName">Member</label>
        <select id="memberName" name="memberName" required>
          <option value="">Select your name</option>
          <option value="Courtney">Courtney</option>
          <option value="Member 2">Member 2</option>
          <option value="Member 3">Member 3</option>
          <option value="Member 4">Member 4</option>
        </select>

        <label for="rating">Rating</label>
        <select id="rating" name="rating" required>
          <option value="">Select a rating</option>
          <option value="1">1</option>
          <option value="1.5">1.5</option>
          <option value="2">2</option>
          <option value="2.5">2.5</option>
          <option value="3">3</option>
          <option value="3.5">3.5</option>
          <option value="4">4</option>
          <option value="4.5">4.5</option>
          <option value="5">5</option>
        </select>

        <label for="note">Thoughts / discussion note</label>
        <textarea id="note" name="note" rows="5" required placeholder="Add your thoughts here..."></textarea>

        <label for="link">Optional link</label>
        <input id="link" name="link" type="url" placeholder="https://..." />

        <button type="submit" id="submit-entry-button">Submit</button>
        <p id="form-message"></p>
      </form>
    </section>

    <section class="entries-section">
      <h3>Book club discussion</h3>
      <div id="entries-container">
        <p>No entries yet.</p>
      </div>
    </section>
  </main>

  <script src="book.js"></script>
</body>
</html>
