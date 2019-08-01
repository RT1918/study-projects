package raijin.audio_system.views;

import raijin.audio_system.models.AudioMode;

public interface ViewInterface {
    void onVolumeChange(int newValue);
    void onPowerStatusChange(boolean status);
    void onTrebleLevelChange(int newValue);
    void onBassLevelChange(int newValue);
    void onModeChange(AudioMode newMode);
    void onPlayStatusChange(boolean newStatus);
    void onTrackChange(int trackNo);
    void onTimerValueChange(int newValue);
    void onTimerStatusChange(boolean status);
}
