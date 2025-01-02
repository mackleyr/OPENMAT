function Buttons({ onShare, onClaim }) {
  const [isCopyClicked, setIsCopyClicked] = useState(false);
  const [isClaimClicked, setIsClaimClicked] = useState(false);

  const { cardData } = useCard();

  // Left: “Copy Link”
  const handleCopyClick = async () => {
    if (!cardData?.share_link) {
      console.log("No share link to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(cardData.share_link);
      setIsCopyClicked(true);
      setTimeout(() => setIsCopyClicked(false), 5000);
      console.log("Link copied:", cardData.share_link);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  // Right: “Claim”
  const handleClaimClick = async () => {
    if (onClaim) {
      await onClaim();
      setIsClaimClicked(true);
      setTimeout(() => setIsClaimClicked(false), 5000);
    }
  };

  // If you still want a “Share” button, just wrap it in handleShare
  const handleShare = async () => {
    if (onShare) await onShare();
  };

  return (
    <div
      className="grid grid-cols-2 gap-[5%] px-[5%] py-[5%] w-full"
      style={{ boxSizing: 'border-box' }}
    >
      {/* left => Copy Link */}
      <Button
        label={isCopyClicked ? 'Copied!' : 'Copy Link'}
        type="secondary"
        onClick={handleCopyClick}
      />
      {/* right => Claim */}
      <Button
        label={isClaimClicked ? 'Claimed!' : 'Claim'}
        type="secondary"
        onClick={handleClaimClick}
      />
      {/**
       * Or you can have a 3rd button somewhere if you want “Share” 
       * <Button label="Share" onClick={handleShare} />
       */}
    </div>
  );
}

export default Buttons;
