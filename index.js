const fs = require('fs');
const nodemailer = require('nodemailer');

async function checkJobs() {
    // 1. Fetch current jobs from Lever's JSON API
    const response = await fetch('https://api.lever.co/v0/postings/appen?mode=json');
    const jobs = await response.json();

    // 2. Load the list of jobs we've already seen
    let seenJobs = [];
    if (fs.existsSync('seen_jobs.json')) {
        seenJobs = JSON.parse(fs.readFileSync('seen_jobs.json'));
    }

    // 3. Filter for new jobs only
    const newJobs = jobs.filter(job => !seenJobs.includes(job.id));

    if (newJobs.length === 0) {
        console.log('No new jobs found this run.');
        return;
    }

    console.log(`Found ${newJobs.length} new jobs. Preparing email...`);

    // 4. Build the email body with details to save you time
    let emailHtml = `<h2>New Appen Job Postings</h2>`;
    
    newJobs.forEach(job => {
        // Extract a snippet of the description
        const snippet = job.descriptionPlain ? job.descriptionPlain.substring(0, 500) + '...' : 'No description provided.';
        const location = job.categories.location || 'Remote/Unspecified';
        const team = job.categories.team || 'General';

        emailHtml += `
            <div style="margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                <h3 style="margin-top: 0;"><a href="${job.hostedUrl}">${job.text}</a></h3>
                <p><strong>Location:</strong> ${location} | <strong>Team:</strong> ${team}</p>
                <p style="color: #555;">${snippet}</p>
                <a href="${job.hostedUrl}" style="background-color: #007bff; color: white; padding: 8px 12px; text-decoration: none; border-radius: 4px;">View Full Job</a>
            </div>
        `;
    });

    // 5. Configure the email transport
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // 6. Send the email
    await transporter.sendMail({
        from: `"Job Bot" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER, 
        subject: `Alert: ${newJobs.length} New Job(s) at Appen`,
        html: emailHtml
    });

    // 7. Update the database file with the new job IDs
    const updatedSeenJobs = [...seenJobs, ...newJobs.map(j => j.id)];
    fs.writeFileSync('seen_jobs.json', JSON.stringify(updatedSeenJobs, null, 2));
    
    console.log('Email sent and state updated successfully.');
}

checkJobs().catch(console.error);
