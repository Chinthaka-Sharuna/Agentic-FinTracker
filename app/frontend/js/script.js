// User Profile Card
const userName = document.getElementById('account-name');
const userPlan = document.getElementById('user-plan-name');
const userAvatar = document.getElementById('user-avatar');

function updateUserProfileCard(name, plan, avatarInitials) {
    /*
    Updates the user profile information in the dashboard.

    Args:
        name: The name of the user to be displayed in the greeting message.
        plan: The subscription plan of the user (e.g., 'Free', 'Pro', 'Premium') to be displayed in the profile section.
    */
    userName.textContent = name;
    userPlan.textContent = plan;
    if (!avatarInitials) {
        name= name.split(' ');
        avatarInitials = name[0].charAt(0) + name[1].charAt(0);
        userAvatar.innerHTML = avatarInitials;
    }else{
        userAvatar.innerHTML = `
        <img src="${avatarInitials}" class= "avatar-img" alt="${name}'s avatar">`;
    }
}


document.addEventListener("DOMContentLoaded", () => {
    updateUserProfileCard('Sharuna Siriwansha', 'Unlimited Plan', 'https://randomuser.me/api/portraits/women/44.jpg');
});

    