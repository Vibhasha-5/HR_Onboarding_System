using System;
using Microsoft.Xrm.Sdk;

namespace HROnboarding.Plugins
{
    public class AssetUpdatePlugin : IPlugin
    {
        public void Execute(IServiceProvider serviceProvider)
        {

            IPluginExecutionContext context =
            (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));

            if (context.InputParameters.Contains("Target") &&
                context.InputParameters["Target"] is Entity)
            {

                Entity entity = (Entity)context.InputParameters["Target"];

                if (entity.LogicalName != "cr_asset")
                    return;

                if (entity.Contains("cr_assetstatus"))
                {

                    OptionSetValue status = (OptionSetValue)entity["cr_assetstatus"];

                    if (status.Value == 100000001)
                    {
                        if (!entity.Contains("cr_allocationdate"))
                        {
                            throw new InvalidPluginExecutionException("Allocation Date required.");
                        }
                    }
                }
            }
        }
    }
}