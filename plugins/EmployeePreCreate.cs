using System;
using Microsoft.Xrm.Sdk;

namespace HROnboarding.Plugins
{
    public class EmployeePreCreate : IPlugin
    {
        public void Execute(IServiceProvider serviceProvider)
        {

            IPluginExecutionContext context =
            (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));

            if (context.InputParameters.Contains("Target") &&
                context.InputParameters["Target"] is Entity)
            {

                Entity entity = (Entity)context.InputParameters["Target"];

                if (entity.LogicalName != "cr_employee")
                    return;

                entity["cr_employmentstatus"] = new OptionSetValue(100000000);
            }
        }
    }
}