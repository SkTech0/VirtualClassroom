namespace VirtualClassroom.Backend.DTOs.Room
{
    public class VideoCallDto
    {
        public string RoomCode { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public bool IsVideoEnabled { get; set; } = true;
        public bool IsAudioEnabled { get; set; } = true;
        public bool IsScreenSharing { get; set; } = false;
    }

    public class VideoOfferDto
    {
        public string RoomCode { get; set; } = string.Empty;
        public string FromUserId { get; set; } = string.Empty;
        public string ToUserId { get; set; } = string.Empty;
        public object Offer { get; set; } = new();
    }

    public class VideoAnswerDto
    {
        public string RoomCode { get; set; } = string.Empty;
        public string FromUserId { get; set; } = string.Empty;
        public string ToUserId { get; set; } = string.Empty;
        public object Answer { get; set; } = new();
    }

    public class VideoIceCandidateDto
    {
        public string RoomCode { get; set; } = string.Empty;
        public string FromUserId { get; set; } = string.Empty;
        public string ToUserId { get; set; } = string.Empty;
        public object Candidate { get; set; } = new();
    }

    public class VideoToggleDto
    {
        public string RoomCode { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public bool IsVideoEnabled { get; set; }
        public bool IsAudioEnabled { get; set; }
    }
} 