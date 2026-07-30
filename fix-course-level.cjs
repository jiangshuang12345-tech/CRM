const fs = require('fs')

let file = fs.readFileSync('src/store.ts', 'utf8')

// The goal is to add a random courseLevel between L1 and L6 to all Student seeded objects
// We can find where the students array is defined.
const studentRegex = /studentId:\s*'(\d+)',([^}]*?)}/g

let replaced = file.replace(/studentId:\s*'(\d+)',([^}]*?)}/g, (match, id, body) => {
    if (body.includes('courseLevel:')) {
        return match // already has one
    }
    
    // Pick random level
    const level = Math.floor(Math.random() * 6) + 1;
    const clStr = `courseLevel: 'L${level}', `
    
    // Add it after studentId or somewhere in the body
    return `studentId: '${id}', ${clStr}${body}}`
})

// update the KEY to trigger a re-seed
replaced = replaced.replace(/const KEY = 'dinoai_crm_state_v\d+'/, "const KEY = 'dinoai_crm_state_v65'")

fs.writeFileSync('src/store.ts', replaced)
