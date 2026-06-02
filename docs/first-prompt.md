I wanna evaluate this repo I haven't touched in years. I first wanna get it on the latest build of Electron and update everything to the latest, then I wanna build it out and test.

If that works, we can evaluate the performance enhancements like making the startup time not take forever, adding extra features like a file viewer and the ability to open multiple galleries at once, side-by-side views, fixing the broken "delete" path and adding a "do you really wanna delete this", and a bunch of other features.

I have this library because no image viewer for Windows has the features I want and touch controls. XnView MP works great with keyboard and mouse, but I run Image Viewer on my Surface tablet as it is far better at allowing touch and giving me the control I need to view images. The bad part is it takes forever to load, I can't delete anymore, I also accidentally tap the delete key too, and the UI is built in a way where it requires using Windows Explorer. If I had it all built into the app with a file manager, it'd be way better.

I also think there are other performance enhancements we could add, but startup speed is very important.

Lastly, this is all JS. It's before I started using TypeScript, so we'll wanna fix that too _after_ updating it to the latest.

I wanna document all these steps we're doing in `docs/`, any worker files (prompts for other agents) into `docs/workers/` and why decisions were made based on our conversations into `docs/research`. Lastly, I wanna add a slim `AGENTS.md` with anything that you'll need to know to ensure we don't break the existing code.

If there aren't tests, we'll need to add them to ensure we don't break anything.
