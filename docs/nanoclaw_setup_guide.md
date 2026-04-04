# Nanoclaw Setup Guide for Aroha

This guide will walk you through setting up **Nanoclaw** on your Windows 11 laptop, Aroha. Nanoclaw is a specialized tool that runs the Claude API inside a secure, isolated container. It is designed to handle overnight tasks for the RiteDoc app, such as generating synthetic training data, updating FAQ content, and creating troubleshooting matrices.

Because Nanoclaw processes sensitive tasks, it must be completely isolated. It will have no access to your personal files, no access to your local network, and no internet access other than the specific connection needed to reach the Claude API.

This guide assumes you have zero prior knowledge of these tools. Every single click and command is explained in plain English.

---

## Part 1: Installing Docker Desktop

Docker is the program that creates the "container" (a secure, isolated box) where Nanoclaw will run.

### Step 1: Download Docker Desktop
1. Open your web browser (like Edge or Chrome).
2. Go to the official Docker website: `https://www.docker.com/products/docker-desktop/`
3. Click the large blue button that says **Download for Windows**.
4. Wait for the file (named something like `Docker Desktop Installer.exe`) to finish downloading.

### Step 2: Install Docker Desktop
1. Open your **Downloads** folder.
2. Double-click the `Docker Desktop Installer.exe` file.
3. If a window pops up asking "Do you want to allow this app to make changes to your device?", click **Yes**.
4. The installer will open. Make sure the box next to **Use WSL 2 instead of Hyper-V (recommended)** is checked.
5. Click **Ok**.
6. The installation will take a few minutes. When it finishes, click **Close and restart**. Your computer will restart.

### Step 3: Start Docker Desktop
1. After your computer restarts, click the Windows Start button at the bottom of your screen.
2. Type `Docker Desktop` and click on the app to open it.
3. A window will appear asking you to accept the terms. Click **Accept**.
4. You may be asked to sign in or create an account. You can click **Continue without signing in** at the bottom.
5. You may be asked a few survey questions. You can click **Skip** at the bottom.
6. Docker Desktop is now running. You will see a green bar or a green icon in the bottom left corner of the Docker window that says "Engine running".

---

## Part 2: Getting Your Claude API Key

Nanoclaw needs a special password, called an API key, to talk to Claude.

1. Open your web browser.
2. Go to `https://console.anthropic.com/`
3. Log in with your account details.
4. On the left side of the screen, click on **Settings**, then click on **API Keys**.
5. Click the button that says **Create Key**.
6. Give the key a name, like `Nanoclaw-Aroha`, and click **Create Key**.
7. A long string of letters and numbers will appear (starting with `sk-ant-`). This is your API key.
8. Click the **Copy** button next to the key.
9. **Important:** Do not close this window yet, or paste the key into a temporary Notepad file. You will need it in the next part.

---

## Part 3: Setting Up the Isolated Nanoclaw Container

Now we will create the secure container for Nanoclaw. We will use the Command Prompt to do this.

### Step 1: Open Command Prompt
1. Click the Windows Start button.
2. Type `cmd`.
3. You will see **Command Prompt** in the search results. Click on it. A black window with white text will open.

### Step 2: Create a Secure Folder
We need a specific folder for Nanoclaw's files. Type the following commands into the black window, pressing **Enter** after each one:

```cmd
cd \
mkdir nanoclaw_data
cd nanoclaw_data
```

### Step 3: Run the Nanoclaw Container
Now we will tell Docker to create the isolated container. This command is long, but it ensures Nanoclaw has no access to your files or the general internet.

Carefully copy the entire block of text below. Before you paste it, replace `YOUR_COPIED_API_KEY_HERE` with the actual API key you copied in Part 2.

```cmd
docker run -d --name nanoclaw --network none --memory="8g" --cpus="4" -e ANTHROPIC_API_KEY="YOUR_COPIED_API_KEY_HERE" -v C:\nanoclaw_data:/app/data ubuntu:22.04 sleep infinity
```

**What this command does (in plain English):**
* `docker run -d`: Starts a new container and runs it in the background.
* `--name nanoclaw`: Names the container "nanoclaw".
* `--network none`: **Crucial Security Step.** This completely disables internet and network access for the container. It cannot talk to your home network or the open internet.
* `--memory="8g"`: Gives the container 8GB of RAM (half of Aroha's 16GB), ensuring it runs smoothly without slowing down your whole laptop.
* `--cpus="4"`: Gives the container access to 4 processor cores.
* `-e ANTHROPIC_API_KEY="..."`: Securely passes your Claude API key to the container.
* `-v C:\nanoclaw_data:/app/data`: Connects the folder we just created to a folder inside the container. This is the *only* place the container can read or write files. It cannot see your Documents, Desktop, or Photos.
* `ubuntu:22.04 sleep infinity`: Uses a standard, secure base system and keeps it running continuously.

Press **Enter** to run the command. Docker will download the necessary files and start the container. You will see a long string of letters and numbers when it succeeds.

---

## Part 4: Queuing Overnight Tasks

Since Nanoclaw is isolated, you give it tasks by placing files in the `C:\nanoclaw_data` folder.

1. Open the standard Windows **File Explorer** (the yellow folder icon).
2. Click on **This PC** on the left side.
3. Double-click on **Local Disk (C:)**.
4. Double-click on the **nanoclaw_data** folder.
5. To queue a task, you will place a text file or a specific instruction file (provided by the RiteDoc team) into this folder.
6. For example, you might drag and drop a file named `generate_faq_batch_1.txt` into this folder before you go to bed.

Nanoclaw is programmed to constantly watch this folder. When it sees a new task file, it will process it using the Claude API.

---

## Part 5: Checking Results in the Morning

1. Open **File Explorer** and go back to `C:\nanoclaw_data`.
2. Nanoclaw will save its completed work in this same folder.
3. Look for new files, usually named something like `completed_faq_batch_1.txt` or `results_training_data.csv`.
4. You can open these files to review the work Nanoclaw completed overnight.

---

## Troubleshooting Common Issues

If things aren't working as expected, check these common solutions.

### Issue 1: Docker says "WSL 2 installation is incomplete"
**The Fix:**
1. Click the Windows Start button, type `cmd`, right-click on **Command Prompt**, and select **Run as administrator**. Click **Yes** if prompted.
2. Type `wsl --install` and press **Enter**.
3. Wait for the process to finish, then restart your computer. Docker should now work.

### Issue 2: The laptop is very slow while Nanoclaw is running
**The Fix:**
Aroha has 16GB of RAM. We allocated 8GB to Nanoclaw. If you are trying to use the laptop for heavy tasks at the same time, it might slow down.
1. Open Docker Desktop.
2. Click the **Containers** tab on the left.
3. Find `nanoclaw` in the list.
4. Click the **Stop** button (a square icon) next to it.
5. Only start it again (using the **Play** button) when you are finished using the laptop for the day.

### Issue 3: Virtualization is disabled in BIOS
If Docker completely fails to start and mentions "Virtualization" or "Hyper-V":
**The Fix:**
1. You need to enable Virtualization in Aroha's BIOS settings.
2. Restart your computer. As soon as the screen goes black, repeatedly press the **F2** or **Delete** key (the exact key depends on the laptop brand) until a technical-looking menu appears.
3. Look for a setting called **Virtualization Technology**, **Intel VT-x**, or **SVM Mode**.
4. Change it from Disabled to **Enabled**.
5. Save the changes and exit (usually by pressing **F10**). The computer will restart normally.

### Issue 4: Nanoclaw isn't processing files
**The Fix:**
1. Ensure the container is actually running. Open Docker Desktop, go to **Containers**, and check that `nanoclaw` has a green "Running" status.
2. If it is stopped, click the **Play** button to start it.
3. Double-check that you placed the task files in exactly `C:\nanoclaw_data` and not a subfolder.
